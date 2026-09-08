export { PaymentChecklist } from './components/PaymentChecklist';
export { SlipDropzone } from './components/SlipDropzone';
export { VerificationStatus } from './components/VerificationStatus';
export { useSlipVerification } from './hooks/use-slip-verification';
export { decodeQrFromFile } from './lib/decode-qr-from-image';
export { isSlipPayload, extractSlipFields, fingerprintPayload } from './lib/slip-payload';
export type { DecodedSlip, SlipFailureReason, SlipStage } from './types';
