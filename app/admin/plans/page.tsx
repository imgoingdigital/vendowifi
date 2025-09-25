import { getDb } from '@/server/db/client';
import { plans } from '@/server/db/schema/plans';
// @ts-ignore - workaround for transient resolution issue
import PlanRow from './PlanRow';
import CreatePlanForm from './CreatePlanForm';

export default async function AdminPlansPage() {
  const db = await getDb();
  const list = await db.select().from(plans).limit(100);
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Plans</h1>
      <CreatePlanForm />
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Price</th>
            <th className="p-2">Duration (min)</th>
            <th className="p-2">Data Cap (MB)</th>
            <th className="p-2">Down Kbps</th>
            <th className="p-2">Up Kbps</th>
            <th className="p-2">Archive</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(p => <PlanRow key={p.id} plan={p} />)}
        </tbody>
      </table>
    </div>
  );
}

