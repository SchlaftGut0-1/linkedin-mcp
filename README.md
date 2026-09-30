# linkedin-mcp

Servidor MCP local en TypeScript para revisar información profesional y preparar cambios para LinkedIn. **Esta versión no conecta con LinkedIn ni modifica tu perfil en esa plataforma.** Funciona sin LinkedIn Developer App.

## Inicio

Requiere Node.js 20 o posterior y npm.

```sh
git clone https://github.com/SchlaftGut0-1/linkedin-mcp.git
cd linkedin-mcp
npm ci
npm test
npm run build
```

En un cliente MCP que permita procesos locales, configura el transporte `stdio`:

```json
{
  "mcpServers": {
    "linkedin-mcp": {
      "command": "node",
      "args": ["/ruta/absoluta/linkedin-mcp/dist/index.js"]
    }
  }
}
```

En Windows utiliza una ruta como `C:/proyectos/linkedin-mcp/dist/index.js`. El formato de configuración depende del cliente. Esta versión no incluye un endpoint HTTP para clientes que requieran un servidor remoto.

## Herramientas

| Herramienta | Comportamiento |
| --- | --- |
| `get_capabilities` | Declara capacidades reales y ausencia de integración LinkedIn |
| `import_profile` | Valida y almacena una copia local proporcionada por el usuario |
| `get_profile` | Lee la copia local |
| `propose_changes` | Guarda texto propuesto por el agente con una justificación |
| `preview_changes` | Devuelve el perfil anterior y el propuesto |
| `export_changes` | Devuelve JSON para aplicación manual; no escribe archivos |

La IA del cliente redacta las mejoras: el servidor almacena y valida datos, sin proveedor LLM ni API key. Importa primero un objeto como este mediante `import_profile`:

```json
{
  "profile": {
    "name": "Example Developer",
    "headline": "Software Developer",
    "about": "Descripción profesional verificable.",
    "experience": [],
    "skills": ["TypeScript"]
  }
}
```

Después pide al agente que prepare cambios basados en tus datos, muestre la propuesta y exporte el resultado. Reemplazar una copia existente requiere `replace: true` y elimina propuestas anteriores. Los campos de arrays propuestos reemplazan el array completo. Los límites de texto son límites internos de validación, no una garantía sobre los límites de LinkedIn.

## Datos y privacidad

Los datos se guardan en `~/.linkedin-mcp/state.json`, fuera del repositorio por defecto. Para cambiarlo, configura `LINKEDIN_MCP_DATA_DIR` en el entorno del proceso MCP. No uses un directorio sincronizado con Git. El almacenamiento es JSON sin cifrar, con permisos restrictivos donde el sistema los admita; no es una bóveda de secretos. Solo debe ejecutarse un proceso por directorio de datos. No publiques tu perfil, tokens o credenciales en este repositorio público.

## Alcance de LinkedIn

- OpenID Connect ofrece identidad básica; no proporciona titular, Acerca de o experiencia completa en su respuesta documentada.
- La Profile API está restringida a desarrolladores aprobados. La documentación de Profile Edit no garantiza acceso para nuevas aplicaciones.
- Asociar una LinkedIn Page a una aplicación no concede automáticamente acceso de edición.
- No hay implementación OAuth, scraping, búsquedas de vacantes ni herramientas de escritura remota en esta versión.

Referencias oficiales:

- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api
- https://www.linkedin.com/help/linkedin/answer/a548360
- https://ts.sdk.modelcontextprotocol.io/v2/

La futura integración oficial se añadirá solo con permisos comprobados. Las propuestas locales seguirán disponibles sin ella.

## Desarrollo

```sh
npm run check
npm test
```

El test inicia el servidor real por stdio y verifica importación, persistencia, propuestas, exportación, validación y protección contra reemplazos accidentales. No se publican datos reales ni se llama a LinkedIn.
