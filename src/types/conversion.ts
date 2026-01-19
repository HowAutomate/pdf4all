export interface ConversionResult {
  ConversionCost: number;
  Files: {
    FileName: string;
    FileExt: string;
    FileSize: number;
    FileId: string;
    Url: string;
  }[];
}

export interface ConversionHistoryItem {
  id: string;
  originalFileName: string;
  convertedFileName: string;
  downloadUrl: string;
  fileSize: number;
  timestamp: Date;
}

export type ConversionStatus = 'idle' | 'uploading' | 'converting' | 'success' | 'error';

export const SUPPORTED_FORMATS = [
  '.bmp', '.csv', '.djvu', '.doc', '.docx', '.dot', '.dotx', '.dwf', '.dwfx', 
  '.dwg', '.dxf', '.eml', '.eps', '.epub', '.gif', '.heic', '.heif', '.htm', 
  '.html', '.ico', '.jfif', '.jpg', '.jpeg', '.key', '.log', '.md', '.mobi', 
  '.msg', '.numbers', '.odc', '.odf', '.odg', '.odp', '.ods', '.odt', '.pages', 
  '.png', '.potx', '.pps', '.ppsx', '.ppt', '.pptx', '.prn', '.ps', '.psd', 
  '.pub', '.rtf', '.svg', '.tif', '.tiff', '.txt', '.vsd', '.vsdx', '.webp', 
  '.wpd', '.xls', '.xlsb', '.xlsx', '.xltx'
] as const;
