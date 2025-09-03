import { useState } from 'react';
import { Link } from 'react-router-dom';

function Home() {
  const [did, setDid] = useState('');
  const handleGetUsers = () => {
    fetch(`/api/getUsers/${did}`)
      .then((response) => response.json())
      // eslint-disable-next-line no-console
      .then((data) => console.log(data))
      .catch((error) => console.error('Error:', error));
  };
  const handleGetResources = () => {
    fetch('/api/resources')
      .then((response) => response.json())
      // eslint-disable-next-line no-console
      .then((data) => console.log(data))
      .catch((error) => console.error('Error:', error));
  };
  const handleGetResourcesSkip = () => {
    fetch('/api/resources-skip')
      .then((response) => response.json())
      // eslint-disable-next-line no-console
      .then((data) => console.log(data))
      .catch((error) => console.error('Error:', error));
  };
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
      <input type="text" placeholder="user-did" value={did} onChange={(e) => setDid(e.target.value)} />
      <button className="app-link" onClick={handleGetUsers} type="button">
        Get Users
      </button>
      <button className="app-link" onClick={handleGetResources} type="button">
        Get Resources
      </button>
      <button className="app-link" onClick={handleGetResourcesSkip} type="button">
        Get Resources Skip
      </button>
    </header>
  );
}

export default Home;
