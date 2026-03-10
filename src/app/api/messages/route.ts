import { NextResponse } from 'next/server';

import { sendTemplateMessage } from '@/lib/gallabox';

type SendTemplateRequest = {
  recipientPhone?: string;
  templateName?: string;
  languageCode?: string;
  bodyValues?: Record<string, string>;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as SendTemplateRequest;

  if (!payload.recipientPhone || !payload.templateName || !payload.languageCode) {
    return NextResponse.json(
      {
        message:
          'recipientPhone, templateName and languageCode are required to send a template message.',
      },
      { status: 400 },
    );
  }

  try {
    const result = await sendTemplateMessage({
      recipientPhone: payload.recipientPhone,
      templateName: payload.templateName,
      languageCode: payload.languageCode,
      bodyValues: payload.bodyValues ?? {},
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to send the template message.';

    return NextResponse.json({ message }, { status: 500 });
  }
}
