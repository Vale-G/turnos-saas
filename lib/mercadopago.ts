
import { MercadoPagoConfig, Preference } from 'mercadopago';

const accessToken = process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error("MercadoPago access token is not defined.");
}

export const mercadoPagoClient = new MercadoPagoConfig({ accessToken });
