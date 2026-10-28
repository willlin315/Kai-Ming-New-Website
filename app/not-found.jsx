import Link from 'next/link';
export default function NotFound() {
  return <main style={{maxWidth: 720, margin:'80px auto', padding:24, fontFamily:'Arial,sans-serif'}}><h1 style={{fontFamily:'var(--font-heading)'}}>Page not found</h1><p><Link href="/">Return to Kai Ming Head Start</Link></p></main>;
}
