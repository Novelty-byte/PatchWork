import { Link } from 'react-router-dom';
import { Layout } from './StatusPage.jsx';

// Temporary page until the manager dashboard is built.
export default function ManagerPlaceholder() {
  return (
    <Layout>
      <div className="st-center">
        <h1>Manager dashboard is coming soon</h1>
        <p className="st-sub">This page is being built next.</p>
        <Link className="btn btn-primary st-narrow" to="/">Back to home</Link>
      </div>
    </Layout>
  );
}
