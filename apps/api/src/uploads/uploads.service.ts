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

  async uploadBase64Image(imageData: string, folder: string = 'progress'): Promise<UploadApiResponse> {
    try {
      this.logger.log(`Uploading base64 image to Cloudinary folder: ${folder}`);

      const uploadInput = imageData.startsWith('data:')
        ? imageData
        : `data:image/jpeg;base64,${imageData}`;

      const result = await cloudinary.uploader.upload(uploadInput, {
        folder,
        resource_type: 'image',
      });

      this.logger.log(`Base64 image uploaded successfully: ${result.public_id}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Base64 upload error: ${error?.message || error}`);
      throw error;
    }
  }

  async uploadBase64Images(images: string[], folder: string = 'progress'): Promise<string[]> {
    const urls: string[] = [];
    for (const image of images) {
      const uploaded = await this.uploadBase64Image(image, folder);
      urls.push(uploaded.secure_url);
    }
    return urls;
  }
}
