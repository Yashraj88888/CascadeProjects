import React from 'react';
import { Link } from 'react-router-dom';

const Card: React.FC<{ title: string; desc: string; to: string }>
  = ({ title, desc, to }) => (
  <div className="ll-card ll-card--purple">
    <h3>{title}</h3>
    <p className="ll-muted">{desc}</p>
    <div style={{ marginTop: 12 }}>
      <Link to={to} className="ll-link">Open</Link>
    </div>
  </div>
);

const Home: React.FC = () => {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Welcome to LinkLens</h2>
      <p className="ll-muted">
        LinkLens is a security toolkit integrating OWASP ZAP, Nmap, Wireshark (tshark), and John the Ripper.
        Use it responsibly and only on targets you are authorized to test.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
        marginTop: 16,
      }}>
        <Card title="OWASP ZAP" desc="Scan a website for common vulnerabilities" to="/zap" />
        <Card title="Nmap" desc="Scan target hosts for open ports and services" to="/nmap" />
        <Card title="Wireshark" desc="Analyze packet captures (.pcap)" to="/wireshark" />
        <Card title="John the Ripper" desc="Attempt to crack hashes with a wordlist" to="/john" />
        <Card 
          title="File Encryptor" 
          desc="Encrypt and decrypt files using various encryption algorithms" 
          to="/file-encryptor" 
        />
      </div>
    </div>
  );
};

export default Home;
