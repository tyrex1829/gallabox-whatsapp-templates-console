'use client';

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { GallaboxTemplate } from '@/lib/gallabox';

import styles from './template-dashboard.module.css';

type Props = {
  templates: GallaboxTemplate[];
};

type SubmissionState =
  | { status: 'idle'; message?: string }
  | { status: 'submitting'; message?: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

const defaultSubmissionState: SubmissionState = { status: 'idle' };

function createInitialBodyValues(template: GallaboxTemplate | undefined | null) {
  const values: Record<string, string> = {};

  if (!template) {
    return values;
  }

  template.variables.forEach((variable) => {
    values[variable] = '';
  });

  return values;
}

function formatDate(value: string | undefined) {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function renderTemplateText(text: string | undefined) {
  if (!text) {
    return null;
  }

  const parts = text.split(/(\{\{.*?\}\})/g);

  return parts.map((part, index) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      const label = part.slice(2, -2).trim();

      return (
        <span className={styles.placeholder} key={`${part}-${index}`}>
          {`{{${label}}}`}
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function TemplateDashboard({ templates }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    () => templates[0]?.id ?? '',
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  );

  const [recipientPhone, setRecipientPhone] = useState('');
  const [bodyValues, setBodyValues] = useState<Record<string, string>>(() =>
    createInitialBodyValues(selectedTemplate),
  );
  const [submissionState, setSubmissionState] = useState<SubmissionState>(
    defaultSubmissionState,
  );

  useEffect(() => {
    setBodyValues(createInitialBodyValues(selectedTemplate));
    setSubmissionState(defaultSubmissionState);
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedTemplateId && templates[0]) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [selectedTemplateId, templates]);

  const handleTemplateChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedTemplateId(event.target.value);
  }, []);

  const handleBodyValueChange = useCallback(
    (variable: string, value: string) => {
      setBodyValues((previous) => ({
        ...previous,
        [variable]: value,
      }));
    },
    [setBodyValues],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedTemplate) {
        return;
      }

      const trimmedPhone = recipientPhone.trim();

      if (!trimmedPhone) {
        setSubmissionState({
          status: 'error',
          message: 'Recipient phone number is required.',
        });

        return;
      }

      const payload = {
        recipientPhone: trimmedPhone,
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language,
        bodyValues: Object.fromEntries(
          Object.entries(bodyValues).map(([key, value]) => [key, value.trim()]),
        ),
      };

      setSubmissionState({ status: 'submitting' });

      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? 'Gallabox rejected the message payload.');
        }

        setSubmissionState({
          status: 'success',
          message: `Message accepted by Gallabox (id: ${result.id}).`,
        });
      } catch (error) {
        setSubmissionState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to send the template message. Please retry.',
        });
      }
    },
    [bodyValues, recipientPhone, selectedTemplate],
  );

  if (!selectedTemplate) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Gallabox WhatsApp Templates</h1>
            <p>No templates were returned for this account.</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Gallabox WhatsApp Templates</h1>
          <p>
            {templates.length} template
            {templates.length === 1 ? '' : 's'} available for account{' '}
            <code>{selectedTemplate?.accountId ?? '—'}</code>
          </p>
        </div>
        <div className={styles.selection}>
          <label className={styles.selectLabel} htmlFor="template-selector">
            Active template
          </label>
          <select
            id="template-selector"
            className={styles.select}
            value={selectedTemplate?.id ?? ''}
            onChange={handleTemplateChange}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.language})
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.listSection}>
          <h2>Template Catalogue</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Language</th>
                  <th>Category</th>
                  <th>Variables</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className={
                      selectedTemplate?.id === template.id ? styles.selectedRow : undefined
                    }
                    onClick={() => setSelectedTemplateId(template.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTemplateId(template.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>{template.name}</td>
                    <td>
                      <span className={`${styles.status} ${styles[template.status] ?? ''}`}>
                        {template.status}
                      </span>
                    </td>
                    <td>{template.language}</td>
                    <td>{template.category ?? '—'}</td>
                    <td>{template.variables.length}</td>
                    <td>{formatDate(template.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.detailSection}>
          <h2>Template Detail</h2>
          {selectedTemplate ? (
            <div className={styles.detailCard}>
              <div className={styles.detailMeta}>
                <p>
                  <strong>Status:</strong> {selectedTemplate.status}
                </p>
                <p>
                  <strong>Language:</strong> {selectedTemplate.language}
                </p>
                <p>
                  <strong>Category:</strong> {selectedTemplate.category ?? '—'}
                </p>
                <p>
                  <strong>Latest Update:</strong> {formatDate(selectedTemplate.updatedAt)}
                </p>
                <p>
                  <strong>Account:</strong> {selectedTemplate.accountId ?? '—'}
                </p>
                <p>
                  <strong>Channel:</strong> {selectedTemplate.channelId ?? '—'}
                </p>
              </div>

              <div>
                <h3>Body</h3>
                <pre className={styles.bodyPreview}>
                  {renderTemplateText(
                    selectedTemplate.components.find((component) => component.type === 'BODY')
                      ?.text,
                  )}
                </pre>
              </div>

              {!!selectedTemplate.variables.length && (
                <div>
                  <h3>Variables</h3>
                  <ul className={styles.variableList}>
                    {selectedTemplate.variables.map((variable, index) => (
                      <li key={variable}>
                        <code>{variable}</code>
                        {selectedTemplate.bodyExample?.[index] ? (
                          <span className={styles.exampleValue}>
                            Example: {selectedTemplate.bodyExample[index]}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedTemplate.footerVariables.length ? (
                <div>
                  <h3>Footer Variables</h3>
                  <ul className={styles.footerVariableList}>
                    {selectedTemplate.footerVariables.map((footerVariable) => (
                      <li key={footerVariable.index}>
                        Slot #{footerVariable.index + 1} · {footerVariable.type}{' '}
                        {footerVariable.required ? '(required)' : '(optional)'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedTemplate.components.filter((component) => component.type !== 'BODY')
                .length ? (
                <div>
                  <h3>Other Components</h3>
                  <ul className={styles.componentList}>
                    {selectedTemplate.components
                      .filter((component) => component.type !== 'BODY')
                      .map((component, index) => (
                        <li key={`${component.type}-${index}`}>
                          <div className={styles.componentHeader}>
                            <strong>{component.type}</strong>
                            {component.format ? (
                              <span className={styles.componentFormat}>
                                {component.format}
                              </span>
                            ) : null}
                          </div>
                          {component.text ? (
                            <p className={styles.componentText}>
                              {renderTemplateText(component.text)}
                            </p>
                          ) : null}
                          {component.buttons?.length ? (
                            <div className={styles.buttonList}>
                              {component.buttons.map((button, buttonIndex) => (
                                <span key={`${component.type}-btn-${buttonIndex}`}>
                                  {button.type}: {button.text ?? button.url ?? button.phone_number ?? '—'}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {component.fileMetaData?.fileName ? (
                            <p className={styles.componentFile}>
                              Attachment: {component.fileMetaData.fileName} (
                              {component.fileMetaData.fileType ?? 'unknown type'})
                            </p>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}

              <form className={styles.form} onSubmit={handleSubmit}>
                <h3>Send A Template Message</h3>
                <label className={styles.field}>
                  <span>Recipient phone (with country code)</span>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(event) => setRecipientPhone(event.target.value)}
                    placeholder="919000000000"
                    required
                  />
                </label>

                {selectedTemplate.variables.map((variable, index) => (
                  <label className={styles.field} key={variable}>
                    <span>{variable}</span>
                    <input
                      type="text"
                      value={bodyValues[variable] ?? ''}
                      placeholder={selectedTemplate.bodyExample?.[index] ?? 'Enter a value'}
                      onChange={(event) => handleBodyValueChange(variable, event.target.value)}
                      required
                    />
                  </label>
                ))}

                <button
                  type="submit"
                  className={styles.submit}
                  disabled={submissionState.status === 'submitting'}
                >
                  {submissionState.status === 'submitting' ? 'Sending…' : 'Send Template Message'}
                </button>

                {submissionState.status === 'error' && (
                  <p className={styles.error}>{submissionState.message}</p>
                )}

                {submissionState.status === 'success' && (
                  <p className={styles.success}>{submissionState.message}</p>
                )}
              </form>
            </div>
          ) : (
            <p>Select a template to view its structure and send messages.</p>
          )}
        </section>
      </div>
    </div>
  );
}
