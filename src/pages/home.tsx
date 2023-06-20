import { Link } from 'react-router-dom';

function Home() {
  return (
    <header className="app-header">
      <h1>Component for blocklet server benchmark</h1>
      <p>Web API</p>
      <pre style={{ textAlign: 'left' }}>
        <code>{`
- /api/date
- /api/date?timeout=1000
- /api/user/{did}?return=0
- /api/users&return=0
- /api/users?search=xxx&return=0
`}</code>
      </pre>
      <Link className="app-link" to="/about">
        About
      </Link>
      <a className="app-link" href="https://developer.blocklet.io/docs/" target="_blank" rel="noopener noreferrer">
        Learn Blocklet
      </a>
    </header>
  );
}

export default Home;
