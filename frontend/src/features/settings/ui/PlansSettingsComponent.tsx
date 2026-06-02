import { useEffect, useState } from 'react';

import { userPlanApi } from '../../../entity/users/api/userPlanApi';
import type { CreatePlanRequest } from '../../../entity/users/model/CreatePlanRequest';
import type { UpdatePlanRequest } from '../../../entity/users/model/UpdatePlanRequest';
import type { UserPlan } from '../../../entity/users/model/UserPlan';
import { UserPlanType } from '../../../entity/users/model/UserPlanType';
import { toastMessage } from '../../../shared/lib/toastMessage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface FormValues {
  name: string;
  type: UserPlanType;
  isPublic: boolean;
  allowedProjectsCount: number | null;
  warningText: string;
  upgradeText: string;
  logsPerSecondLimit: number | null;
  maxLogsAmount: number | null;
  maxLogsSizeMb: number | null;
  maxLogsLifeDays: number | null;
  maxLogSizeKb: number | null;
}

interface LimitFieldValues {
  allowedProjectsUnlimited: boolean;
  logsPerSecondUnlimited: boolean;
  maxLogsAmountUnlimited: boolean;
  maxLogsSizeMbUnlimited: boolean;
  maxLogsLifeDaysUnlimited: boolean;
  maxLogSizeKbUnlimited: boolean;
}

const initialFormValues: FormValues = {
  name: '',
  type: UserPlanType.DEFAULT,
  isPublic: false,
  allowedProjectsCount: null,
  warningText: '',
  upgradeText: '',
  logsPerSecondLimit: null,
  maxLogsAmount: null,
  maxLogsSizeMb: null,
  maxLogsLifeDays: null,
  maxLogSizeKb: null,
};

export const PlansSettingsComponent = () => {
  // State
  const [plans, setPlans] = useState<UserPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<UserPlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnsaved, setIsUnsaved] = useState(false);

  // Form values
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);

  // Unlimited checkboxes state
  const [limitUnlimited, setLimitUnlimited] = useState<LimitFieldValues>({
    allowedProjectsUnlimited: false,
    logsPerSecondUnlimited: false,
    maxLogsAmountUnlimited: false,
    maxLogsSizeMbUnlimited: false,
    maxLogsLifeDaysUnlimited: false,
    maxLogSizeKbUnlimited: false,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const fetchedPlans = await userPlanApi.getPlans();
      setPlans(fetchedPlans);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load plans';
      toastMessage.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForChanges = () => {
    if (!editingPlan) {
      setIsUnsaved(true);
      return;
    }

    const currentAllowedProjects = limitUnlimited.allowedProjectsUnlimited
      ? 0
      : formValues.allowedProjectsCount || 0;

    const hasBasicChanges =
      formValues.name !== editingPlan.name ||
      formValues.type !== editingPlan.type ||
      formValues.isPublic !== editingPlan.isPublic ||
      currentAllowedProjects !== editingPlan.allowedProjectsCount ||
      formValues.warningText !== editingPlan.warningText ||
      formValues.upgradeText !== editingPlan.upgradeText;

    const currentLogsPerSecond = limitUnlimited.logsPerSecondUnlimited
      ? 0
      : formValues.logsPerSecondLimit || 0;
    const currentMaxLogs = limitUnlimited.maxLogsAmountUnlimited
      ? 0
      : formValues.maxLogsAmount || 0;
    const currentMaxSize = limitUnlimited.maxLogsSizeMbUnlimited
      ? 0
      : formValues.maxLogsSizeMb || 0;
    const currentMaxLife = limitUnlimited.maxLogsLifeDaysUnlimited
      ? 0
      : formValues.maxLogsLifeDays || 0;
    const currentMaxLogSize = limitUnlimited.maxLogSizeKbUnlimited
      ? 0
      : formValues.maxLogSizeKb || 0;

    const hasLimitChanges =
      currentLogsPerSecond !== editingPlan.logsPerSecondLimit ||
      currentMaxLogs !== editingPlan.maxLogsAmount ||
      currentMaxSize !== editingPlan.maxLogsSizeMb ||
      currentMaxLife !== editingPlan.maxLogsLifeDays ||
      currentMaxLogSize !== editingPlan.maxLogSizeKb;

    setIsUnsaved(hasBasicChanges || hasLimitChanges);
  };

  useEffect(() => {
    checkForChanges();
  }, [formValues, limitUnlimited, editingPlan]);

  const updateFormValue = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setFormValues(initialFormValues);
    setLimitUnlimited({
      allowedProjectsUnlimited: false,
      logsPerSecondUnlimited: false,
      maxLogsAmountUnlimited: false,
      maxLogsSizeMbUnlimited: false,
      maxLogsLifeDaysUnlimited: false,
      maxLogSizeKbUnlimited: false,
    });
    setIsUnsaved(false);
    setIsModalVisible(true);
  };

  const handleEdit = (plan: UserPlan) => {
    setEditingPlan(plan);
    setFormValues({
      name: plan.name,
      type: plan.type,
      isPublic: plan.isPublic,
      allowedProjectsCount: plan.allowedProjectsCount,
      warningText: plan.warningText,
      upgradeText: plan.upgradeText,
      logsPerSecondLimit: plan.logsPerSecondLimit || null,
      maxLogsAmount: plan.maxLogsAmount || null,
      maxLogsSizeMb: plan.maxLogsSizeMb || null,
      maxLogsLifeDays: plan.maxLogsLifeDays || null,
      maxLogSizeKb: plan.maxLogSizeKb || null,
    });

    setLimitUnlimited({
      allowedProjectsUnlimited: plan.allowedProjectsCount === 0,
      logsPerSecondUnlimited: plan.logsPerSecondLimit === 0,
      maxLogsAmountUnlimited: plan.maxLogsAmount === 0,
      maxLogsSizeMbUnlimited: plan.maxLogsSizeMb === 0,
      maxLogsLifeDaysUnlimited: plan.maxLogsLifeDays === 0,
      maxLogSizeKbUnlimited: plan.maxLogSizeKb === 0,
    });

    setIsUnsaved(false);
    setIsModalVisible(true);
  };

  const handleDelete = (planId: string) => {
    setDeletingPlanId(planId);
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deletingPlanId) return;

    setIsSaving(true);
    try {
      await userPlanApi.deletePlan(deletingPlanId);
      toastMessage.success('Plan deleted successfully');
      setIsDeleteModalVisible(false);
      setDeletingPlanId(null);
      await loadPlans();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete plan';
      toastMessage.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalOk = async () => {
    // Validation
    if (!formValues.name.trim()) {
      toastMessage.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const requestData: CreatePlanRequest | UpdatePlanRequest = {
        name: formValues.name,
        type: formValues.type,
        isPublic: formValues.isPublic,
        allowedProjectsCount: limitUnlimited.allowedProjectsUnlimited
          ? 0
          : formValues.allowedProjectsCount || 0,
        warningText: formValues.warningText || '',
        upgradeText: formValues.upgradeText || '',
        logsPerSecondLimit: limitUnlimited.logsPerSecondUnlimited
          ? 0
          : formValues.logsPerSecondLimit || 0,
        maxLogsAmount: limitUnlimited.maxLogsAmountUnlimited ? 0 : formValues.maxLogsAmount || 0,
        maxLogsSizeMb: limitUnlimited.maxLogsSizeMbUnlimited ? 0 : formValues.maxLogsSizeMb || 0,
        maxLogsLifeDays: limitUnlimited.maxLogsLifeDaysUnlimited
          ? 0
          : formValues.maxLogsLifeDays || 0,
        maxLogSizeKb: limitUnlimited.maxLogSizeKbUnlimited ? 0 : formValues.maxLogSizeKb || 0,
      };

      if (editingPlan) {
        await userPlanApi.updatePlan(editingPlan.id, requestData as UpdatePlanRequest);
        toastMessage.success('Plan updated successfully');
      } else {
        await userPlanApi.createPlan(requestData as CreatePlanRequest);
        toastMessage.success('Plan created successfully');
      }

      setIsModalVisible(false);
      setFormValues(initialFormValues);
      await loadPlans();
    } catch (error: unknown) {
      if (error instanceof Error && error.message) {
        toastMessage.error(error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setFormValues(initialFormValues);
    setIsUnsaved(false);
  };

  const handleUnlimitedChange = (field: keyof LimitFieldValues, checked: boolean) => {
    setLimitUnlimited({ ...limitUnlimited, [field]: checked });
    if (checked) {
      const fieldMap: Record<keyof LimitFieldValues, keyof FormValues> = {
        allowedProjectsUnlimited: 'allowedProjectsCount',
        logsPerSecondUnlimited: 'logsPerSecondLimit',
        maxLogsAmountUnlimited: 'maxLogsAmount',
        maxLogsSizeMbUnlimited: 'maxLogsSizeMb',
        maxLogsLifeDaysUnlimited: 'maxLogsLifeDays',
        maxLogSizeKbUnlimited: 'maxLogSizeKb',
      };
      updateFormValue(fieldMap[field], null);
    }
  };

  const deletingPlan = plans.find((p) => p.id === deletingPlanId);

  return (
    <div className="my-8 max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Plans Management</h2>
        <Button
          className="border-emerald-600 bg-emerald-600 hover:border-emerald-700 hover:bg-emerald-700"
          onClick={handleCreate}
        >
          Create Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center py-4">
          <Spinner />
          <span className="ml-2 text-sm text-gray-500">Loading plans...</span>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Allowed projects</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>{plan.name}</TableCell>
                <TableCell>
                  <Badge variant={plan.type === UserPlanType.EXTENDED ? 'default' : 'secondary'}>
                    {plan.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={plan.isPublic ? 'default' : 'secondary'}>
                    {plan.isPublic ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell>{plan.allowedProjectsCount}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(plan)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(plan.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalVisible} onOpenChange={(open) => { if (!open) handleModalCancel(); }}>
        <DialogContent className="max-w-[650px]">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Plan name"
                value={formValues.name}
                onChange={(e) => updateFormValue('name', e.target.value)}
              />
            </div>

            {/* Type */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={formValues.type}
                onValueChange={(value) => updateFormValue('type', value as UserPlanType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserPlanType.DEFAULT}>DEFAULT</SelectItem>
                  <SelectItem value={UserPlanType.EXTENDED}>EXTENDED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Is public */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={formValues.isPublic}
                onCheckedChange={(checked) => updateFormValue('isPublic', checked === true)}
              />
              <label htmlFor="isPublic" className="text-sm font-medium">
                Is public
              </label>
            </div>

            {/* Allowed Projects */}
            <div>
              <label className="mb-1 block text-sm font-medium">Allowed projects</label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={formValues.allowedProjectsCount ?? ''}
                  onChange={(e) =>
                    updateFormValue(
                      'allowedProjectsCount',
                      e.target.value === '' ? null : parseInt(e.target.value),
                    )
                  }
                  disabled={limitUnlimited.allowedProjectsUnlimited}
                  className="flex-1"
                />

                <div className="flex flex-1 items-center space-x-2 pl-3">
                  <Checkbox
                    id="allowedProjectsUnlimited"
                    checked={limitUnlimited.allowedProjectsUnlimited}
                    onCheckedChange={(checked) =>
                      handleUnlimitedChange('allowedProjectsUnlimited', checked === true)
                    }
                  />
                  <label htmlFor="allowedProjectsUnlimited" className="text-sm">
                    Unlimited
                  </label>
                </div>
              </div>
            </div>

            {/* Warning Text */}
            <div>
              <label className="mb-1 block text-sm font-medium">Warning Text</label>
              <Textarea
                rows={2}
                placeholder="Optional"
                value={formValues.warningText}
                onChange={(e) => updateFormValue('warningText', e.target.value)}
              />
            </div>

            {/* Upgrade Text */}
            <div>
              <label className="mb-1 block text-sm font-medium">Upgrade Text</label>
              <Textarea
                rows={2}
                placeholder="Optional"
                value={formValues.upgradeText}
                onChange={(e) => updateFormValue('upgradeText', e.target.value)}
              />
            </div>

            {/* Limit Fields */}
            <div className="rounded border border-gray-200 p-3">
              <h3 className="mb-2 text-sm font-semibold">Limits</h3>

              <div className="space-y-2 text-sm">
                <LimitRow
                  label="Logs/Second:"
                  value={formValues.logsPerSecondLimit}
                  disabled={limitUnlimited.logsPerSecondUnlimited}
                  onValueChange={(v) => updateFormValue('logsPerSecondLimit', v)}
                  unlimited={limitUnlimited.logsPerSecondUnlimited}
                  onUnlimitedChange={(c) => handleUnlimitedChange('logsPerSecondUnlimited', c)}
                  unlimitedId="logsPerSecondUnlimited"
                />

                <LimitRow
                  label="Max Logs:"
                  value={formValues.maxLogsAmount}
                  disabled={limitUnlimited.maxLogsAmountUnlimited}
                  onValueChange={(v) => updateFormValue('maxLogsAmount', v)}
                  unlimited={limitUnlimited.maxLogsAmountUnlimited}
                  onUnlimitedChange={(c) => handleUnlimitedChange('maxLogsAmountUnlimited', c)}
                  unlimitedId="maxLogsAmountUnlimited"
                />

                <LimitRow
                  label="Max Size (MB):"
                  value={formValues.maxLogsSizeMb}
                  disabled={limitUnlimited.maxLogsSizeMbUnlimited}
                  onValueChange={(v) => updateFormValue('maxLogsSizeMb', v)}
                  unlimited={limitUnlimited.maxLogsSizeMbUnlimited}
                  onUnlimitedChange={(c) => handleUnlimitedChange('maxLogsSizeMbUnlimited', c)}
                  unlimitedId="maxLogsSizeMbUnlimited"
                />

                <LimitRow
                  label="Retention (Days):"
                  value={formValues.maxLogsLifeDays}
                  disabled={limitUnlimited.maxLogsLifeDaysUnlimited}
                  onValueChange={(v) => updateFormValue('maxLogsLifeDays', v)}
                  unlimited={limitUnlimited.maxLogsLifeDaysUnlimited}
                  onUnlimitedChange={(c) => handleUnlimitedChange('maxLogsLifeDaysUnlimited', c)}
                  unlimitedId="maxLogsLifeDaysUnlimited"
                />

                <LimitRow
                  label="Max Log Size (KB):"
                  value={formValues.maxLogSizeKb}
                  disabled={limitUnlimited.maxLogSizeKbUnlimited}
                  onValueChange={(v) => updateFormValue('maxLogSizeKb', v)}
                  unlimited={limitUnlimited.maxLogSizeKbUnlimited}
                  onUnlimitedChange={(c) => handleUnlimitedChange('maxLogSizeKbUnlimited', c)}
                  unlimitedId="maxLogSizeKbUnlimited"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleModalCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleModalOk}
              disabled={isSaving || (editingPlan ? !isUnsaved : false)}
              className="border-emerald-600 bg-emerald-600 hover:border-emerald-700 hover:bg-emerald-700"
            >
              {isSaving && <Spinner size="sm" className="mr-2" />}
              {editingPlan ? (isUnsaved ? 'Update' : 'No Changes') : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalVisible} onOpenChange={(open) => { if (!open) { setIsDeleteModalVisible(false); setDeletingPlanId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the plan <strong>{deletingPlan?.name}</strong>? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalVisible(false);
                setDeletingPlanId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isSaving}>
              {isSaving && <Spinner size="sm" className="mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface LimitRowProps {
  label: string;
  value: number | null;
  disabled: boolean;
  onValueChange: (value: number | null) => void;
  unlimited: boolean;
  onUnlimitedChange: (checked: boolean) => void;
  unlimitedId: string;
}

function LimitRow({
  label,
  value,
  disabled,
  onValueChange,
  unlimited,
  onUnlimitedChange,
  unlimitedId,
}: LimitRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="w-40 text-gray-600">{label}</span>

      <div className="flex flex-1 items-center space-x-2">
        <Input
          type="number"
          min={0}
          className="flex-1 h-7 text-xs"
          disabled={disabled}
          placeholder="0"
          value={value ?? ''}
          onChange={(e) =>
            onValueChange(e.target.value === '' ? null : parseInt(e.target.value))
          }
        />

        <div className="flex flex-1 items-center space-x-2 pl-3">
          <Checkbox
            id={unlimitedId}
            checked={unlimited}
            onCheckedChange={(checked) => onUnlimitedChange(checked === true)}
          />
          <label htmlFor={unlimitedId} className="text-sm">
            Unlimited
          </label>
        </div>
      </div>
    </div>
  );
}
