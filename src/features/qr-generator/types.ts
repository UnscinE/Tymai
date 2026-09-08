export type QRLogoPreset = {
  id: string;
  label: string;
  /** path ใน public/ */
  src: string;
};

export type QRLogo =
  | { kind: 'none' }
  | { kind: 'preset'; presetId: string; src: string }
  | { kind: 'custom'; src: string; fileName: string };

export type PaymentQRData = {
  payload: string;
  accountName: string;
};
