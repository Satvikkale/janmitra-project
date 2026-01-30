import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(EventsGateway.name);

  /**
   * Handle join event for socket rooms
   */
  @SubscribeMessage('join')
  join(@ConnectedSocket() client: Socket, @MessageBody() data: { rooms: string[] }) {
    try {
      (data?.rooms || []).forEach(r => client.join(r));
      this.logger.log(`Client ${client.id} joined rooms: ${data?.rooms?.join(', ')}`);
      return { ok: true, joined: data?.rooms || [] };
    } catch (error) {
      this.logger.error('Error joining rooms', error.stack);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Emit complaint created event to relevant rooms
   */
  emitComplaintCreated(c: any) {
    try {
      this.server.emit('complaint.created', c); // broadcast (MVP)
      if (c?.societyId) this.server.to(`society:${c.societyId}`).emit('complaint.created', c);
      if (c?.orgId) this.server.to(`org:${c.orgId}`).emit('complaint.created', c);
      this.logger.log(`Complaint created event emitted for: ${c._id}`);
    } catch (error) {
      this.logger.error('Error emitting complaint.created', error.stack);
    }
  }

  /**
   * Emit complaint updated event to relevant rooms
   */
  emitComplaintUpdated(c: any) {
    try {
      this.server.emit('complaint.updated', c);
      if (c?.societyId) this.server.to(`society:${c.societyId}`).emit('complaint.updated', c);
      if (c?.orgId) this.server.to(`org:${c.orgId}`).emit('complaint.updated', c);
      this.logger.log(`Complaint updated event emitted for: ${c._id}`);
    } catch (error) {
      this.logger.error('Error emitting complaint.updated', error.stack);
    }
  }
}