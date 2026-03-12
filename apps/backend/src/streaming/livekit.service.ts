import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import { ENV } from "../config/env.token";
import { type Env } from "../config/env";

@Injectable()
export class LivekitService {
  constructor(@Inject(ENV) private env: Env) {}

  getUrl(): string {
    if (!this.env.LIVEKIT_URL) throw new ServiceUnavailableException("LIVEKIT_URL não configurado");
    return this.env.LIVEKIT_URL;
  }

  createToken(input: { identity: string; name?: string; roomName: string; grant: VideoGrant; ttlSeconds: number }) {
    if (!this.env.LIVEKIT_API_KEY || !this.env.LIVEKIT_API_SECRET) {
      throw new ServiceUnavailableException("LIVEKIT_API_KEY/LIVEKIT_API_SECRET não configurados");
    }
    const token = new AccessToken(this.env.LIVEKIT_API_KEY, this.env.LIVEKIT_API_SECRET, {
      identity: input.identity,
      name: input.name,
      ttl: input.ttlSeconds
    });
    token.addGrant({ ...input.grant, room: input.roomName });
    return token.toJwt();
  }
}

