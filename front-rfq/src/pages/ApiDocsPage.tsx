import React from 'react';
import { useLanguageStore } from '../stores/useLanguageStore';
import './ApiDocsPage.css';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/projects',
    desc_es: 'Listar todos los proyectos de tu organizacion',
    desc_en: 'List all projects in your organization',
    curl: `curl -H "X-API-Key: beval_xxx" \\
  https://your-domain.com/api/v1/projects`,
  },
  {
    method: 'POST',
    path: '/api/v1/projects',
    desc_es: 'Crear un nuevo proyecto',
    desc_en: 'Create a new project',
    curl: `curl -X POST -H "X-API-Key: beval_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"display_name":"My Project","project_type":"RFP"}' \\
  https://your-domain.com/api/v1/projects`,
  },
  {
    method: 'GET',
    path: '/api/v1/scoring?project_id=<uuid>',
    desc_es: 'Obtener ranking de proveedores para un proyecto',
    desc_en: 'Get provider ranking for a project',
    curl: `curl -H "X-API-Key: beval_xxx" \\
  "https://your-domain.com/api/v1/scoring?project_id=<uuid>"`,
  },
  {
    method: 'POST',
    path: '/api/v1/scoring',
    desc_es: 'Disparar evaluacion de scoring con IA',
    desc_en: 'Trigger AI scoring evaluation',
    curl: `curl -X POST -H "X-API-Key: beval_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<uuid>"}' \\
  https://your-domain.com/api/v1/scoring`,
  },
  {
    method: 'GET',
    path: '/api/v1/reports?project_id=<uuid>',
    desc_es: 'Listar informes generados para un proyecto',
    desc_en: 'List generated reports for a project',
    curl: `curl -H "X-API-Key: beval_xxx" \\
  "https://your-domain.com/api/v1/reports?project_id=<uuid>"`,
  },
  {
    method: 'POST',
    path: '/api/v1/upload',
    desc_es: 'Subir archivo PDF para procesamiento',
    desc_en: 'Upload PDF file for processing',
    curl: `curl -X POST -H "X-API-Key: beval_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<uuid>","filename":"doc.pdf","file_base64":"..."}' \\
  https://your-domain.com/api/v1/upload`,
  },
];

export const ApiDocsPage: React.FC = () => {
  const { language } = useLanguageStore();

  return (
    <div className="apidocs-page">
      <div className="apidocs-header">
        <h1>{language === 'es' ? 'Documentacion API' : 'API Documentation'}</h1>
        <p className="apidocs-subtitle">
          {language === 'es'
            ? 'Usa la API REST de BidEval para integrar evaluaciones con tus sistemas.'
            : 'Use the BidEval REST API to integrate evaluations with your systems.'}
        </p>
      </div>

      {/* Auth section */}
      <section className="apidocs-section">
        <h2>{language === 'es' ? 'Autenticacion' : 'Authentication'}</h2>
        <p>
          {language === 'es'
            ? 'Incluye una API key en el header de cada request:'
            : 'Include an API key in the header of each request:'}
        </p>
        <pre className="apidocs-code">X-API-Key: beval_your_key_here</pre>
        <p>
          {language === 'es'
            ? 'Tambien puedes usar un JWT de Supabase Auth con Bearer token.'
            : 'You can also use a Supabase Auth JWT with Bearer token.'}
        </p>
      </section>

      {/* Rate Limits */}
      <section className="apidocs-section">
        <h2>{language === 'es' ? 'Rate Limits' : 'Rate Limits'}</h2>
        <p>
          {language === 'es'
            ? '100 requests/hora por API key. Uploads: 20/hora. El header X-RateLimit-Remaining indica las requests restantes.'
            : '100 requests/hour per API key. Uploads: 20/hour. The X-RateLimit-Remaining header indicates remaining requests.'}
        </p>
      </section>

      {/* Endpoints */}
      <section className="apidocs-section">
        <h2>Endpoints</h2>
        <div className="apidocs-endpoints">
          {ENDPOINTS.map((ep, i) => (
            <div key={i} className="apidocs-endpoint">
              <div className="apidocs-endpoint-header">
                <span className={`apidocs-method apidocs-method-${ep.method.toLowerCase()}`}>
                  {ep.method}
                </span>
                <code className="apidocs-path">{ep.path}</code>
              </div>
              <p className="apidocs-endpoint-desc">
                {language === 'es' ? ep.desc_es : ep.desc_en}
              </p>
              <pre className="apidocs-code apidocs-curl">{ep.curl}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* Errors */}
      <section className="apidocs-section">
        <h2>{language === 'es' ? 'Errores' : 'Errors'}</h2>
        <table className="apidocs-error-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>{language === 'es' ? 'Descripcion' : 'Description'}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>400</td><td>Bad Request</td></tr>
            <tr><td>401</td><td>Unauthorized</td></tr>
            <tr><td>403</td><td>Forbidden</td></tr>
            <tr><td>404</td><td>Not Found</td></tr>
            <tr><td>429</td><td>Rate Limited</td></tr>
            <tr><td>500</td><td>Internal Error</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
};
