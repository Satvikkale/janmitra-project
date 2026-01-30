import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string = 'complaints'): Promise<UploadApiResponse> {
    try {
      this.logger.log(`Uploading image to Cloudinary folder: ${folder}`);
      
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              this.logger.error(`Cloudinary upload failed: ${error.message}`);
              reject(error);
            } else {
              this.logger.log(`Image uploaded successfully: ${result?.public_id}`);
              resolve(result as UploadApiResponse);
            }
          }
        ).end(file.buffer);
      });
    } catch (error) {
      this.logger.error(`Upload error: ${error.message}`);
      throw error;
    }
  }
}
