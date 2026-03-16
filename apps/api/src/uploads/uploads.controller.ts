import { Body, BadRequestException, Controller, Get, Post, Query, Logger, UseGuards } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Get signed upload parameters for Cloudinary
   */
  @Get('sign')
  sign(@Query('folder') folder = 'complaints') {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign: Record<string, any> = { timestamp, folder };
      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET!,
      );
      this.logger.log(`Upload signature generated for folder: ${folder}`);
      return {
        timestamp,
        folder,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      };
    } catch (error) {
      this.logger.error('Error generating upload signature', error.stack);
      throw error;
    }
  }

  @Post('images')
  @UseGuards(JwtAuthGuard)
  async uploadImages(
    @Body() body: { images?: string[]; folder?: string },
  ) {
    const images = Array.isArray(body?.images) ? body.images : [];
    if (images.length === 0) {
      throw new BadRequestException('images array is required');
    }

    const folder = (body?.folder || 'progress').trim() || 'progress';
    const urls = await this.uploadsService.uploadBase64Images(images, folder);
    return { urls };
  }
}