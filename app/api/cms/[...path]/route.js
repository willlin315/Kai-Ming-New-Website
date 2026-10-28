import { cms } from '../../../../lib/cms-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handle(request, { params }) {
  const { path = [] } = await params;
  return cms().handle(request, path);
}
export { handle as GET, handle as PUT, handle as POST, handle as OPTIONS };
