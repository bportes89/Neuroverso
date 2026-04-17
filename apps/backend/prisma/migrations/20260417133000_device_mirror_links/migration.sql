CREATE TABLE "DeviceMirrorLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceMirrorLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceMirrorLink_token_key" ON "DeviceMirrorLink"("token");
CREATE INDEX "DeviceMirrorLink_appointmentId_expiresAt_idx" ON "DeviceMirrorLink"("appointmentId", "expiresAt");
CREATE INDEX "DeviceMirrorLink_deviceId_expiresAt_idx" ON "DeviceMirrorLink"("deviceId", "expiresAt");

ALTER TABLE "DeviceMirrorLink" ADD CONSTRAINT "DeviceMirrorLink_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceMirrorLink" ADD CONSTRAINT "DeviceMirrorLink_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceMirrorLink" ADD CONSTRAINT "DeviceMirrorLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
