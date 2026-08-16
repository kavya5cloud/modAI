

export type StorageReadInput = {
  key: string
}

export type StorageReadResult = {
  body: Buffer
}

export type StorageDeleteResult = void


export type StorageDeleteInput = {
  key: string
}

export type UploadUrlResult = {
  uploadUrl: string
  // This should be stable and used by ingestion to fetch the file content.
  key: string
  // Used by frontend for displaying/opening citations.
  fileUrl: string
}

export type UploadUrlResponse = UploadUrlResult & {
  documentId: string
}


export type StorageProvider = {
  // Generates a backend-controlled upload URL/token compatible with the existing upload flow.
  // Contract: /api/upload-url returns { documentId, key, uploadUrl, fileUrl }.
  // This method should only generate uploadUrl + fileUrl; persistence happens elsewhere.

  // getUploadUrl must create the documents DB record.
  getUploadUrl: (args: {

    companyId: string

    userId: string
    key: string
    filename: string
    contentType: string
    sizeBytes: number
  }) => Promise<UploadUrlResponse>


  // Writes an object directly (no presign round-trip). Used for small assets
  // such as company logos, where a two-step upload adds no value.
  putObject: (args: { key: string; body: Buffer; contentType: string }) => Promise<void>

  readObject: (args: StorageReadInput) => Promise<StorageReadResult>
  deleteObject: (args: StorageDeleteInput) => Promise<void>

  buildObjectUrl: (key: string) => string


  // Used by backend ingestion; local provider may need to know where objects live.
  // Optional but helpful.
  exists?: (args: StorageReadInput) => Promise<boolean>
}

