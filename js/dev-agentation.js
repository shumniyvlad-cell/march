/* Тулбар Agentation: заметки на странице уходят агенту через MCP (localhost:4747).
   Грузится только с локалки, см. вызов в index.html. */
import { createElement } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import { Agentation } from 'https://esm.sh/agentation@3.1.2?deps=react@18.3.1,react-dom@18.3.1';

const host = document.createElement('div');
host.id = 'agentation-root';
document.body.appendChild(host);
createRoot(host).render(createElement(Agentation, { endpoint: 'http://localhost:4747' }));
