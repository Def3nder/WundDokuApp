declare module "heic-convert" {
  type HeicConvertOptions = {
    buffer: Buffer | Uint8Array;
    format: "JPEG" | "PNG";
    quality?: number;
  };

  function heicConvert(options: HeicConvertOptions): Promise<Buffer | Uint8Array>;

  export default heicConvert;
}
