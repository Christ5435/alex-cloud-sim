import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { StorageUsage } from '@/components/dashboard/StorageUsage';
import { NodeStatus } from '@/components/dashboard/NodeStatus';
import { FileGrid } from '@/components/dashboard/FileGrid';
import { FileUpload } from '@/components/dashboard/FileUpload';

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to AlexCloudSim</p>
          </div>
          <FileUpload onUploadComplete={() => setRefreshTrigger(t => t + 1)} />
        </div>

        <StatsCards />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Recent Files</h2>
            <FileGrid refreshTrigger={refreshTrigger} />
          </div>
          <div className="space-y-4">
            <StorageUsage />
            <NodeStatus compact />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}