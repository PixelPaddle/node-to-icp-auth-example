import express, { Request, Response, NextFunction } from 'express';
import { ic, Record, StableBTreeMap, text } from 'azle';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Enum for HTTP status codes
enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  INTERNAL_SERVER_ERROR = 500,
}

// Enum for response messages
enum ResponseMessages {
  SUCCESS = 'Success',
  OTP_SENT = 'An OTP has been sent to your email',
  EMAIL_EMPTY = 'Please enter email',
  USER_NOT_FOUND = 'Sorry, User not found',
  INVALID_OTP = 'Your OTP is invalid. Please try again',
  OTP_EXPIRED = 'Your OTP has been expired',
  SERVER_ERROR = 'Internal Server Error'
}

// Define a record for user data
const MediumRecord = Record({
  id: text,
  otp: text,
  email: text,
  otpGeneratedAt: text
});

type MediumRecord = typeof MediumRecord.tsType;

// Maps for storing user data and secret values
const mediumRecordMap = StableBTreeMap<string, MediumRecord>(0);
const secretMap = StableBTreeMap<string, string>(1);

const app = express();
app.use(express.json());
app.use(express.text());

// Middleware to handle CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Methods, Credentials');
  next();
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Methods, Credentials,platform');
    
    return res.json("ok");
  }
});

// Function to generate a 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to get the current IC time
function getCurrentTime(): string {
  return ic.time().toString();
}

// Function to convert an object to a base64 string
function convertToBase64(obj: any): string {
  const str = JSON.stringify(obj);
  return Buffer.from(str).toString('base64');
}

// Function to replace special characters in a base64 string
function replaceBase64SpecialChars(b64string: string): string {
  return b64string.replace(/[=+/]/g, (charToBeReplaced: string) => {
    switch (charToBeReplaced) {
      case '=':
        return '';
      case '+':
        return '-';
      case '/':
        return '_';
      default:
        return charToBeReplaced;
    }
  });
}

// Function to create a JWT signature
function createJwtSignature(jwtB64Header: string, jwtB64Payload: string): string {
  const secretObj = secretMap.get("jwtsecret");
  const secret = secretObj.Some?.toString()!;
  const signature = crypto.createHmac('sha256', secret);
  signature.update(`${jwtB64Header}.${jwtB64Payload}`);
  const signatureBase64 = signature.digest('base64');
  return replaceBase64SpecialChars(signatureBase64);
}

// Function to create a JWT token
function createJwtToken(payload: any): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  
  const b64Header = convertToBase64(header);
  const jwtB64Header = replaceBase64SpecialChars(b64Header);
  
  const b64Payload = convertToBase64(payload);
  const jwtB64Payload = replaceBase64SpecialChars(b64Payload);
  
  const signature = createJwtSignature(jwtB64Header, jwtB64Payload);
  return `${jwtB64Header}.${jwtB64Payload}.${signature}`;
}

// Endpoint for user login and OTP generation
app.post('/user/otp/login', async (req: Request, res: Response) => {
  try {
    const { email } = JSON.parse(req.body);
    
    // Check if email is provided
    if (!email) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: ResponseMessages.EMAIL_EMPTY,
        data: "",
      });
    }
    
    const id = uuidv4(); // Generate a unique ID
    const otp = generateOtp(); // Generate OTP
    const otpGeneratedAt = getCurrentTime(); // Get current time
    
    const oldRecord = mediumRecordMap.get(email);
    
    if ("None" in oldRecord) {
      // If user record doesn't exist, create a new one
      mediumRecordMap.insert(email, {
        id,
        otp,
        email,
        otpGeneratedAt
      });
      
    } else {
      // If user record exists, update it
      const updatedRecord: MediumRecord = {
        id: oldRecord.Some?.id!,
        otp,
        email: oldRecord.Some?.email!,
        otpGeneratedAt
      };
      
      mediumRecordMap.insert(email, updatedRecord);
    }
    
    //:TODO Insert your mail setting to send code.
    return res.status(HttpStatus.OK).json({
      message: ResponseMessages.OTP_SENT,
    });
    
  } catch (e) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: ResponseMessages.SERVER_ERROR,
      data: e,
    });
  }
});

// Endpoint for OTP verification
app.post('/user/otp/verify', async (req: Request, res: Response) => {
  const { email, otp } = JSON.parse(req.body);
  
  try {
    // Check if email and OTP are provided
    if (!email || !otp) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: ResponseMessages.EMAIL_EMPTY,
        data: "",
      });
    }
    const user = mediumRecordMap.get(email);
    
    if ("None" in user) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: ResponseMessages.USER_NOT_FOUND,
        data: null,
      });
    }
    
    // Check if provided OTP matches the stored OTP
    if (user.Some?.otp !== otp) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: ResponseMessages.INVALID_OTP,
        data: null,
      });
    }
    
    // Check if the OTP has expired (15 minutes)
    const fifteenMinutesInNanoseconds = BigInt(15 * 60 * 1e9);
    const startTimestamp = BigInt(user.Some?.otpGeneratedAt!);
    const currentTimestamp = BigInt(ic.time().toString());
    
    if (currentTimestamp - startTimestamp >= fifteenMinutesInNanoseconds) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: ResponseMessages.OTP_EXPIRED,
        data: null,
      });
    }
    
    // Create a JWT token
    const jwtPayload = {
      id: user.Some?.id.toString(),
      otp: user.Some?.otp.toString(),
      email: user.Some?.email.toString(),
      otpGeneratedAt: user.Some?.otpGeneratedAt.toString(),
      jwtCreatedAt: ic.time().toString()
    };
    
    const token = createJwtToken(jwtPayload);
    
    return res.status(HttpStatus.OK).json({
      message: ResponseMessages.SUCCESS,
      data: { data: jwtPayload, token },
    });
    
  } catch (e) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: ResponseMessages.SERVER_ERROR,
      data: e,
    });
  }
});

// Serve static files from the 'dist' directory
app.use(express.static('dist'));
app.listen();
