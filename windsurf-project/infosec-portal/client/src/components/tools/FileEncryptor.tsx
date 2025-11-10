import React, { useState, useRef, ChangeEvent } from 'react';
import { saveAs } from 'file-saver';
import CryptoJS from 'crypto-js';

// Extend CryptoJS type definitions
declare module 'crypto-js' {
  namespace mode {
    interface BlockCipherMode {
      processBlock: (words: number[], offset: number) => void;
    }
  }
}

type Algorithm = 
  | 'AES-128-CBC' | 'AES-192-CBC' | 'AES-256-CBC'  // AES CBC modes
  | 'AES-128-ECB' | 'AES-192-ECB' | 'AES-256-ECB'  // AES ECB modes
  | 'AES-128-CFB' | 'AES-192-CFB' | 'AES-256-CFB'  // AES CFB modes
  | 'AES-128-OFB' | 'AES-192-OFB' | 'AES-256-OFB'  // AES OFB modes
  | 'AES-128-CTR' | 'AES-192-CTR' | 'AES-256-CTR'  // AES CTR modes
  | 'DES-CBC' | 'DES-ECB' | 'DES-CFB' | 'DES-OFB'  // DES modes
  | '3DES-CBC' | '3DES-ECB' | '3DES-CFB' | '3DES-OFB';  // Triple DES modes

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const FileEncryptor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [algorithm, setAlgorithm] = useState<Algorithm>('AES-256-CBC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [operation, setOperation] = useState<'encrypt' | 'decrypt'>('encrypt');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      addLog(`Selected file: ${e.target.files[0].name}`, 'info');
    }
  };

  const processFile = async () => {
    if (!selectedFile) {
      addLog('Please select a file first', 'error');
      return;
    }

    if (!password) {
      addLog('Please enter a password', 'error');
      return;
    }

    setIsProcessing(true);
    addLog(`Starting ${operation}ion process...`, 'info');

    try {
      const fileData = await readFileAsArrayBuffer(selectedFile);
      
      if (operation === 'encrypt') {
        // Convert to WordArray for encryption
        const wordArray = uint8ArrayToWordArray(fileData);
        
        // Encrypt the data
        const encrypted = encryptData(wordArray);
        
        // Convert encrypted data to Uint8Array for download
        const encryptedUint8Array = wordArrayToUint8Array(encrypted);
        
        // Create and save the encrypted file
        const blob = new Blob([encryptedUint8Array.buffer as ArrayBuffer], { type: 'application/octet-stream' });
        saveAs(blob, `${selectedFile.name}.enc`);
        addLog('File encrypted successfully', 'success');
      } else {
        // For decryption
        // Convert to WordArray for decryption
        const encryptedData = uint8ArrayToWordArray(fileData);
        
        // Decrypt the data
        const decrypted = decryptData(encryptedData);
        
        // Convert decrypted WordArray to Uint8Array
        const decryptedUint8Array = wordArrayToUint8Array(decrypted);
        
        // Create and save the decrypted file
        // Create a new Uint8Array with a standard ArrayBuffer
        const data = new Uint8Array(decryptedUint8Array.length);
        data.set(decryptedUint8Array);
        
        const blob = new Blob([data.buffer], { 
          type: 'application/octet-stream' 
        });
        
        const outputName = selectedFile.name.endsWith('.enc') 
          ? selectedFile.name.slice(0, -4) 
          : `${selectedFile.name}.decrypted`;
          
        saveAs(blob, outputName);
        addLog('File decrypted successfully', 'success');
      }
    } catch (error) {
      console.error('Error:', error);
      addLog(
        `Error during ${operation}ion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileAsArrayBuffer = (file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          if (e.target.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(e.target.result));
          } else {
            reject(new Error('Failed to read file as ArrayBuffer'));
          }
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };

  const getKeyAndIV = () => {
    // Generate key and IV based on password and algorithm
    const keySize = algorithm.includes('256') ? 256 : algorithm.includes('192') ? 192 : 128;
    const key = CryptoJS.PBKDF2(password, 'salt', {
      keySize: keySize / 32,
      iterations: 1000
    });
    
    // For IV, we'll use a portion of the key
    const iv = CryptoJS.lib.WordArray.create(key.words.slice(0, 4), 16);
    
    return { key, iv };
  };

  const getCipherParams = (algorithm: string) => {
    const [cipher, keySize, mode] = algorithm.split('-')
    
    // Get key size in bits
    const keySizeBits = keySize ? parseInt(keySize, 10) : 192; // Default to 192 for DES/3DES
    
    // Get cipher mode
    let cipherMode: CryptoJS.mode.BlockCipherMode;
    
    switch (mode) {
      case 'ECB':
        cipherMode = CryptoJS.mode.ECB;
        break;
      case 'CFB':
        cipherMode = {
          ...CryptoJS.mode.CFB,
          processBlock: (words: number[], offset: number) => {
            // Call the original processBlock with the correct 'this' context
            (CryptoJS.mode.CFB as any).processBlock.call(CryptoJS.mode.CFB, words, offset);
          }
        } as CryptoJS.mode.BlockCipherMode;
        break;
      case 'OFB':
        cipherMode = {
          ...CryptoJS.mode.OFB,
          processBlock: (words: number[], offset: number) => {
            (CryptoJS.mode.OFB as any).processBlock.call(CryptoJS.mode.OFB, words, offset);
          }
        } as CryptoJS.mode.BlockCipherMode;
        break;
      case 'CTR':
        cipherMode = {
          ...CryptoJS.mode.CTR,
          processBlock: (words: number[], offset: number) => {
            (CryptoJS.mode.CTR as any).processBlock.call(CryptoJS.mode.CTR, words, offset);
          }
        } as CryptoJS.mode.BlockCipherMode;
        break;
      default:
        cipherMode = CryptoJS.mode.CBC;
    }
    
    return { 
      cipher, 
      keySize: keySizeBits, 
      mode: cipherMode 
    };
  };

  const encryptData = (data: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray => {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const { cipher, keySize, mode } = getCipherParams(algorithm);
    
    // Derive key using PBKDF2
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: keySize / 32,
      iterations: 1000
    });
    
    // Generate random IV (not needed for ECB mode)
    const iv = mode === CryptoJS.mode.ECB 
      ? undefined 
      : CryptoJS.lib.WordArray.random(128/8);
    
    // Prepare cipher params
    const cipherParams: any = {
      mode: mode,
      padding: CryptoJS.pad.Pkcs7
    };
    
    if (iv) {
      cipherParams.iv = iv;
    }
    
    // Encrypt using the appropriate cipher
    let encrypted;
    if (cipher === 'AES') {
      encrypted = CryptoJS.AES.encrypt(
        data,
        key,
        cipherParams
      );
    } else if (cipher === 'DES') {
      encrypted = CryptoJS.DES.encrypt(
        data,
        key,
        cipherParams
      );
    } else { // 3DES
      encrypted = CryptoJS.TripleDES.encrypt(
        data,
        key,
        cipherParams
      );
    }
    
    // Prepare output format: [salt][iv][encryptedData]
    const outputParts = [
      salt.toString(),
      iv ? iv.toString() : '',
      encrypted.ciphertext.toString()
    ];
    
    return CryptoJS.enc.Hex.parse(outputParts.join(''));
  };

  const decryptData = (data: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray => {
    try {
      const dataHex = data.toString();
      const { cipher, keySize, mode } = getCipherParams(algorithm);
      
      // Extract salt (first 32 chars)
      const salt = CryptoJS.enc.Hex.parse(dataHex.substring(0, 32));
      
      // For ECB mode, there's no IV
      let iv;
      let encryptedHex;
      
      if (mode === CryptoJS.mode.ECB) {
        // No IV in ECB mode
        encryptedHex = dataHex.substring(32);
      } else {
        // Extract IV (next 32 chars) for non-ECB modes
        iv = CryptoJS.enc.Hex.parse(dataHex.substring(32, 64));
        encryptedHex = dataHex.substring(64);
      }
      
      // Derive key using the same parameters as encryption
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: keySize / 32,
        iterations: 1000
      });
      
      // Prepare cipher params
      const cipherParams: any = {
        mode: mode,
        padding: CryptoJS.pad.Pkcs7
      };
      
      if (iv) {
        cipherParams.iv = iv;
      }
      
      // Create cipher params for decryption
      const encryptedData = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Hex.parse(encryptedHex),
        salt: salt,
        iv: iv,
        algorithm: cipher === 'AES' ? CryptoJS.algo.AES : 
                  cipher === 'DES' ? CryptoJS.algo.DES : 
                  CryptoJS.algo.TripleDES,
        mode: mode,
        padding: CryptoJS.pad.Pkcs7,
        blockSize: cipher === 'AES' ? 4 : 2, // AES: 128 bits = 4 words, DES/3DES: 64 bits = 2 words
        formatter: CryptoJS.format.OpenSSL
      });
      
      // Decrypt using the appropriate cipher
      let decrypted;
      if (cipher === 'AES') {
        decrypted = CryptoJS.AES.decrypt(encryptedData, key, cipherParams);
      } else if (cipher === 'DES') {
        decrypted = CryptoJS.DES.decrypt(encryptedData, key, cipherParams);
      } else { // 3DES
        decrypted = CryptoJS.TripleDES.decrypt(encryptedData, key, cipherParams);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt. Please check your password and algorithm selection.');
    }
  };

  const wordArrayToUint8Array = (wordArray: CryptoJS.lib.WordArray): Uint8Array => {
    const { words, sigBytes } = wordArray;
    const u8 = new Uint8Array(sigBytes);
    
    for (let i = 0; i < sigBytes; i++) {
      u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    
    return u8;
  };

  const uint8ArrayToWordArray = (u8Array: Uint8Array): CryptoJS.lib.WordArray => {
    const words: number[] = [];
    const len = u8Array.length;
    
    // Process each 4-byte chunk
    for (let i = 0; i < len; i += 4) {
      let word = 0;
      for (let j = 0; j < 4 && i + j < len; j++) {
        word |= (u8Array[i + j] & 0xff) << (24 - j * 8);
      }
      words.push(word);
    }
    
    return CryptoJS.lib.WordArray.create(words, len);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPassword('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="tool-container">
      <h2>File Encryption/Decryption Tool</h2>
      
      <div className="form-group">
        <label>Operation:</label>
        <div className="btn-group">
          <button 
            className={`btn ${operation === 'encrypt' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setOperation('encrypt')}
          >
            Encrypt
          </button>
          <button 
            className={`btn ${operation === 'decrypt' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setOperation('decrypt')}
          >
            Decrypt
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="algorithm">Encryption Algorithm:</label>
        <select 
          id="algorithm" 
          className="form-control"
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
        >
          {/* AES Modes */}
          <optgroup label="AES CBC">
            <option value="AES-256-CBC">AES-256-CBC</option>
            <option value="AES-192-CBC">AES-192-CBC</option>
            <option value="AES-128-CBC">AES-128-CBC</option>
          </optgroup>
          <optgroup label="AES ECB">
            <option value="AES-256-ECB">AES-256-ECB</option>
            <option value="AES-192-ECB">AES-192-ECB</option>
            <option value="AES-128-ECB">AES-128-ECB</option>
          </optgroup>
          <optgroup label="AES CFB">
            <option value="AES-256-CFB">AES-256-CFB</option>
            <option value="AES-192-CFB">AES-192-CFB</option>
            <option value="AES-128-CFB">AES-128-CFB</option>
          </optgroup>
          <optgroup label="AES OFB">
            <option value="AES-256-OFB">AES-256-OFB</option>
            <option value="AES-192-OFB">AES-192-OFB</option>
            <option value="AES-128-OFB">AES-128-OFB</option>
          </optgroup>
          <optgroup label="AES CTR">
            <option value="AES-256-CTR">AES-256-CTR</option>
            <option value="AES-192-CTR">AES-192-CTR</option>
            <option value="AES-128-CTR">AES-128-CTR</option>
          </optgroup>
          
          {/* DES Modes */}
          <optgroup label="DES">
            <option value="DES-CBC">DES-CBC</option>
            <option value="DES-ECB">DES-ECB</option>
            <option value="DES-CFB">DES-CFB</option>
            <option value="DES-OFB">DES-OFB</option>
          </optgroup>
          
          {/* Triple DES Modes */}
          <optgroup label="Triple DES">
            <option value="3DES-CBC">3DES-CBC</option>
            <option value="3DES-ECB">3DES-ECB</option>
            <option value="3DES-CFB">3DES-CFB</option>
            <option value="3DES-OFB">3DES-OFB</option>
          </optgroup>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="file">Select File:</label>
        <input
          id="file"
          type="file"
          className="form-control"
          onChange={handleFileChange}
          ref={fileInputRef}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter encryption/decryption password"
        />
      </div>

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={processFile}
          disabled={isProcessing || !selectedFile || !password}
        >
          {isProcessing ? 'Processing...' : operation === 'encrypt' ? 'Encrypt File' : 'Decrypt File'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={resetForm}
          disabled={isProcessing}
        >
          Reset
        </button>
      </div>

      <div className="logs-container">
        <h4>Activity Log:</h4>
        <div className="log-entries">
          {logs.length === 0 ? (
            <div className="log-entry">No activity yet. Select a file and start encrypting/decrypting.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`log-entry log-${log.type}`}>
                <span className="log-timestamp">[{log.timestamp}] </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .tool-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .btn-group {
          display: flex;
          gap: 10px;
          margin: 10px 0;
        }
        .btn {
          padding: 8px 16px;
          border: 1px solid #ccc;
          background: #f8f9fa;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-primary {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }
        .btn-outline-primary {
          background: white;
          color: #007bff;
          border-color: #007bff;
        }
        .btn-secondary {
          background: #6c757d;
          color: white;
          border-color: #6c757d;
        }
        .form-control {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-top: 5px;
        }
        .logs-container {
          margin-top: 30px;
          border: 1px solid #eee;
          border-radius: 4px;
          padding: 15px;
        }
        .log-entries {
          max-height: 200px;
          overflow-y: auto;
          margin-top: 10px;
        }
        .log-entry {
          padding: 8px;
          border-bottom: 1px solid #eee;
          font-family: monospace;
        }
        .log-timestamp {
          color: #666;
          margin-right: 10px;
        }
        .log-info { color: #17a2b8; }
        .log-success { color: #28a745; }
        .log-warning { color: #ffc107; }
        .log-error { color: #dc3545; }
        .button-group {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }
      `}</style>
    </div>
  );
};

export default FileEncryptor;
