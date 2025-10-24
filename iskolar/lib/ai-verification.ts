import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

// Use Gemini 2.5 Pro for advanced document analysis with vision capabilities
const MODEL_NAME = 'gemini-2.5-pro';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds

/**
 * Helper function to retry API calls with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    // Check if error is retryable (503, 429, network errors)
    const isRetryable = error instanceof Error && (
      error.message.includes('503') ||
      error.message.includes('overloaded') ||
      error.message.includes('429') ||
      error.message.includes('rate limit')
    );

    if (!isRetryable) {
      throw error;
    }

    console.warn(`Request failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Exponential backoff: double the delay for next retry
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

export interface ExtractedData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthdate?: string;
  address?: string;
  idNumber?: string;
  schoolName?: string;
  documentType?: string;
  [key: string]: string | undefined;
}

export interface Discrepancy {
  field: string;
  expectedValue: string;
  foundValue: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface VerificationResult {
  extractedData: ExtractedData;
  discrepancies: Discrepancy[];
  confidenceLevel: 'low' | 'medium' | 'high';
  summary: string;
  verified: boolean;
}

/**
 * Extract data from document image using Gemini Vision API
 */
export async function extractDocumentData(
  imageBase64: string,
  documentType: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractedData> {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Validate base64 string
    if (!imageBase64 || imageBase64.length === 0) {
      throw new Error('Empty base64 data provided');
    }

    // Validate MIME type
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimeTypes.includes(mimeType.toLowerCase())) {
      throw new Error(`Unsupported MIME type: ${mimeType}. Supported types: ${validMimeTypes.join(', ')}`);
    }

    console.log('Extracting data from document:', {
      documentType,
      mimeType,
      base64Length: imageBase64.length,
    });

    const prompt = `You are an expert document analyzer. Extract all relevant information from this ${documentType} document.

Please extract the following information if available:
- Full name (firstName, lastName, middleName if present)
- Birthdate (in YYYY-MM-DD format if possible)
- Address
- ID number or document number
- School name (if applicable)
- Any other relevant identifying information

Return the data in JSON format with clear field names. If a field is not found, omit it from the response.
Be precise and only extract information that is clearly visible in the document.`;

    // Use retry logic for API call
    const result = await retryWithBackoff(async () => {
      return await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
      ]);
    });

    const response = result.response.text();
    console.log('AI extraction response received');
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('Successfully extracted data:', Object.keys(parsed));
      return parsed;
    } catch (error) {
      console.error('Failed to parse extracted data:', error);
      console.error('Response was:', response);
      return {};
    }
  } catch (error) {
    console.error('Error in extractDocumentData:', error);
    if (error instanceof Error && error.message.includes('Provided image is not valid')) {
      throw new Error(
        `Invalid image format for ${documentType}. Please ensure the document is a valid JPEG, PNG, or PDF file. ` +
        `MIME type: ${mimeType}`
      );
    }
    throw error;
  }
}

/**
 * Cross-validate extracted document data against registration data
 */
export async function crossValidateDocument(
  extractedData: ExtractedData,
  userData: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    birthdate: string;
    address_line1: string;
    barangay: string;
    [key: string]: string | undefined;
  },
  documentType: string
): Promise<VerificationResult> {
  const discrepancies: Discrepancy[] = [];

  // Compare names
  if (extractedData.firstName || extractedData.lastName) {
    const extractedFirstName = extractedData.firstName?.toLowerCase().trim();
    const extractedLastName = extractedData.lastName?.toLowerCase().trim();
    const userFirstName = userData.first_name?.toLowerCase().trim();
    const userLastName = userData.last_name?.toLowerCase().trim();

    if (extractedFirstName && extractedFirstName !== userFirstName) {
      discrepancies.push({
        field: 'First Name',
        expectedValue: userData.first_name,
        foundValue: extractedData.firstName || '',
        severity: 'high',
        description: `First name mismatch: Expected "${userData.first_name}" but found "${extractedData.firstName}"`,
      });
    }

    if (extractedLastName && extractedLastName !== userLastName) {
      discrepancies.push({
        field: 'Last Name',
        expectedValue: userData.last_name,
        foundValue: extractedData.lastName || '',
        severity: 'high',
        description: `Last name mismatch: Expected "${userData.last_name}" but found "${extractedData.lastName}"`,
      });
    }
  }

  // Compare birthdate
  if (extractedData.birthdate) {
    const normalizedExtracted = extractedData.birthdate.split('T')[0];
    const normalizedUser = userData.birthdate.split('T')[0];
    
    if (normalizedExtracted !== normalizedUser) {
      discrepancies.push({
        field: 'Birthdate',
        expectedValue: normalizedUser,
        foundValue: normalizedExtracted,
        severity: 'high',
        description: `Birthdate mismatch: Expected "${normalizedUser}" but found "${normalizedExtracted}"`,
      });
    }
  }

  // Compare address (partial match due to formatting differences)
  if (extractedData.address) {
    const extractedAddr = extractedData.address.toLowerCase();
    const userAddr = `${userData.address_line1} ${userData.barangay}`.toLowerCase();
    
    // Check if addresses have some overlap
    const hasOverlap = extractedAddr.includes(userData.barangay.toLowerCase()) ||
                       userAddr.includes(extractedData.address.toLowerCase());
    
    if (!hasOverlap) {
      discrepancies.push({
        field: 'Address',
        expectedValue: userAddr,
        foundValue: extractedData.address,
        severity: 'medium',
        description: 'Address does not match registration data',
      });
    }
  }

  // Determine confidence level based on discrepancies
  let confidenceLevel: 'low' | 'medium' | 'high';
  const highSeverityCount = discrepancies.filter(d => d.severity === 'high').length;
  const mediumSeverityCount = discrepancies.filter(d => d.severity === 'medium').length;

  if (highSeverityCount >= 2) {
    confidenceLevel = 'low';
  } else if (highSeverityCount === 1 || mediumSeverityCount >= 2) {
    confidenceLevel = 'medium';
  } else if (discrepancies.length > 0) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'high';
  }

  // Generate summary using Gemini
  const summary = await generateVerificationSummary(
    extractedData,
    userData,
    documentType,
    discrepancies,
    confidenceLevel
  );

  return {
    extractedData,
    discrepancies,
    confidenceLevel,
    summary,
    verified: discrepancies.length === 0,
  };
}

/**
 * Generate a human-readable summary of verification results
 */
async function generateVerificationSummary(
  extractedData: ExtractedData,
  userData: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    birthdate: string;
    address_line1: string;
    barangay: string;
    [key: string]: string | undefined;
  },
  documentType: string,
  discrepancies: Discrepancy[],
  confidenceLevel: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `You are an AI assistant helping admins review scholarship applications.

Document Type: ${documentType}
Confidence Level: ${confidenceLevel}

Extracted Data from Document:
${JSON.stringify(extractedData, null, 2)}

User Registration Data:
Name: ${userData.first_name} ${userData.middle_name || ''} ${userData.last_name}
Birthdate: ${userData.birthdate}
Address: ${userData.address_line1}, ${userData.barangay}

Discrepancies Found (${discrepancies.length}):
${discrepancies.map(d => `- ${d.description}`).join('\n')}

Please provide a concise, professional summary (2-3 sentences) for the admin reviewing this document. Include:
1. Whether the document appears authentic and matches the registration data
2. Key discrepancies if any
3. A recommendation (Approve/Review/Reject) based on the findings

Keep it clear and actionable for quick decision-making.`;

  const result = await retryWithBackoff(async () => {
    return await model.generateContent(prompt);
  });
  
  return result.response.text();
}

/**
 * Verify a document file (converts to base64 and processes)
 */
export async function verifyDocumentFile(
  file: Buffer,
  mimeType: string,
  documentType: string,
  userData: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    birthdate: string;
    address_line1: string;
    barangay: string;
    [key: string]: string | undefined;
  }
): Promise<VerificationResult> {
  try {
    // Validate file buffer
    if (!file || file.length === 0) {
      throw new Error('Empty file buffer provided');
    }

    // Validate file size (max 20MB for Gemini)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.length > maxSize) {
      throw new Error(`File too large: ${(file.length / 1024 / 1024).toFixed(2)}MB. Max size is 20MB.`);
    }

    console.log('Processing document:', {
      mimeType,
      documentType,
      bufferSize: file.length,
      bufferSizeMB: (file.length / 1024 / 1024).toFixed(2),
    });

    // Check file magic bytes to verify actual file type
    const magicBytes = file.slice(0, 4).toString('hex');
    const isPNG = magicBytes.startsWith('89504e47');
    const isJPEG = magicBytes.startsWith('ffd8ff');
    const isPDF = magicBytes.startsWith('25504446'); // %PDF
    
    console.log('File signature detected:', {
      magicBytes,
      isPNG,
      isJPEG,
      isPDF,
      declaredMimeType: mimeType,
    });

    // Validate file type matches magic bytes
    let actualMimeType = mimeType;
    if (isPNG && !mimeType.includes('png')) {
      console.warn('MIME type mismatch: File is PNG but declared as', mimeType);
      actualMimeType = 'image/png';
    } else if (isJPEG && !mimeType.includes('jpeg') && !mimeType.includes('jpg')) {
      console.warn('MIME type mismatch: File is JPEG but declared as', mimeType);
      actualMimeType = 'image/jpeg';
    } else if (isPDF && !mimeType.includes('pdf')) {
      console.warn('MIME type mismatch: File is PDF but declared as', mimeType);
      actualMimeType = 'application/pdf';
    }

    // Convert buffer to base64
    const base64 = file.toString('base64');
    
    if (!base64 || base64.length === 0) {
      throw new Error('Failed to encode document to base64');
    }

    console.log('Document encoded to base64:', {
      base64Length: base64.length,
      estimatedSizeMB: (base64.length * 0.75 / 1024 / 1024).toFixed(2),
    });
    
    // Extract data from document
    const extractedData = await extractDocumentData(base64, documentType, actualMimeType);
    
    // Cross-validate with user data
    const result = await crossValidateDocument(extractedData, userData, documentType);
    
    console.log('Verification completed:', {
      confidenceLevel: result.confidenceLevel,
      discrepanciesCount: result.discrepancies.length,
      verified: result.verified,
    });
    
    return result;
  } catch (error) {
    console.error('Error in verifyDocumentFile:', error);
    throw error;
  }
}
