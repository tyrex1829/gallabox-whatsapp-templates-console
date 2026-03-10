import 'server-only';

const baseUrl = process.env.GALLABOX_BASE_URL ?? 'https://server.gallabox.com';
const accountId = process.env.GALLABOX_ACCOUNT_ID;
const channelId = process.env.GALLABOX_CHANNEL_ID;
const apiKey = process.env.GALLABOX_API_KEY;
const apiSecret = process.env.GALLABOX_API_SECRET;

if (!accountId || !channelId || !apiKey || !apiSecret) {
  throw new Error(
    'Gallabox environment variables are missing. Please check `.env.local` or your deployment secrets.',
  );
}

const resolvedAccountId = accountId as string;
const resolvedChannelId = channelId as string;
const resolvedApiKey = apiKey as string;
const resolvedApiSecret = apiSecret as string;

async function gallaboxFetch(path: string, init: RequestInit) {
  const headers: HeadersInit = {
    apiKey: resolvedApiKey,
    apiSecret: resolvedApiSecret,
    'Content-Type': 'application/json',
    ...(init.headers ?? {}),
  };

  const response = await fetch(new URL(path, baseUrl).toString(), {
    ...init,
    headers,
    cache: 'no-store',
  });

  return response;
}

type RawTemplateComponent = {
  type: string;
  format?: string;
  text?: string;
  example?: {
    header_handle?: string[];
    body_text?: string[][];
    footer_text?: string[][];
  };
  buttons?: Array<{
    type: string;
    text?: string;
    phone_number?: string;
    url?: string;
  }>;
  fileMetaData?: {
    fileName?: string;
    fileType?: string;
  };
};

type RawTemplate = {
  _id?: string;
  id?: string;
  accountId?: string;
  channelId?: string;
  name: string;
  status: string;
  language: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  allow_category_change?: boolean;
  rejected_reason?: string;
  variables?: string[];
  footerVariables?: Array<{
    index: number;
    type: string;
    required: boolean;
  }>;
  components?: RawTemplateComponent[];
};

export type GallaboxTemplate = {
  id: string;
  accountId?: string;
  channelId?: string;
  name: string;
  status: string;
  language: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  allowCategoryChange?: boolean;
  rejectedReason?: string;
  variables: string[];
  footerVariables: Array<{
    index: number;
    type: string;
    required: boolean;
  }>;
  components: RawTemplateComponent[];
  bodyExample?: string[];
};

function normalizeTemplate(raw: RawTemplate): GallaboxTemplate {
  const id = raw._id ?? raw.id;

  if (!id) {
    throw new Error('Template payload is missing an identifier.');
  }

  const bodyComponent = raw.components?.find((component) => component.type === 'BODY');
  const bodyExample = bodyComponent?.example?.body_text?.[0];

  return {
    id,
    accountId: raw.accountId,
    channelId: raw.channelId,
    name: raw.name,
    status: raw.status,
    language: raw.language,
    category: raw.category,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    allowCategoryChange: raw.allow_category_change,
    rejectedReason: raw.rejected_reason,
    variables: raw.variables ?? [],
    footerVariables: raw.footerVariables ?? [],
    components: raw.components ?? [],
    bodyExample,
  };
}

export async function fetchTemplates(): Promise<GallaboxTemplate[]> {
  const response = await gallaboxFetch(`/devapi/accounts/${resolvedAccountId}/whatsappTemplates`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch Gallabox templates (status ${response.status}): ${errorText}`,
    );
  }

  const payload = (await response.json()) as RawTemplate[];

  return payload.map(normalizeTemplate);
}

export type SendTemplateInput = {
  recipientPhone: string;
  templateName: string;
  languageCode: string;
  bodyValues: Record<string, string>;
};

export type SendTemplateResponse = {
  id: string;
  status: string;
  message: string;
  warnings?: unknown[];
};

export async function sendTemplateMessage(
  input: SendTemplateInput,
): Promise<SendTemplateResponse> {
  const response = await gallaboxFetch('/devapi/messages/whatsapp', {
    method: 'POST',
    body: JSON.stringify({
      channelId: resolvedChannelId,
      recipient: {
        phone: input.recipientPhone,
      },
      whatsapp: {
        type: 'template',
        template: {
          templateName: input.templateName,
          languageCode: input.languageCode,
          bodyValues: input.bodyValues,
        },
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const errorMessage =
      (payload && (payload.message || payload.error)) ?? 'Failed to send template message.';
    throw new Error(errorMessage);
  }

  return payload as SendTemplateResponse;
}

export function getChannelId() {
  return resolvedChannelId;
}
