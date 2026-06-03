import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toastMessage } from '@/shared/lib/toastMessage';
import { getUserShortTimeFormat } from '@/shared/time';
import { ArrowLeftRight, Loader2, Plus, Trash2, User, UserPlus } from 'lucide-react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

import type {
  AddMemberRequest,
  AddMemberResponse,
  ChangeMemberRoleRequest,
  GetMembersResponse,
  ProjectMemberResponse,
  ProjectResponse,
  TransferOwnershipRequest,
} from '../../../entity/projects';
import { projectMembershipApi } from '../../../entity/projects';
import { AddMemberStatusEnum } from '../../../entity/projects/model/AddMemberStatus';
import type { UserProfile } from '../../../entity/users';
import { userManagementApi } from '../../../entity/users/api/userManagementApi';
import { ProjectRole } from '../../../entity/users/model/ProjectRole';
import { UserRole } from '../../../entity/users/model/UserRole';
import { StringUtils } from '../../../shared/lib';

interface Props {
  projectResponse: ProjectResponse;
  user: UserProfile;
}

export function ProjectMembershipComponent({ projectResponse, user }: Props) {
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ email: '', role: ProjectRole.MEMBER });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberEmailError, setAddMemberEmailError] = useState(false);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');

  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);

  const [isTransferOwnershipModalOpen, setIsTransferOwnershipModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ selectedMemberId: '' });
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);
  const [transferMemberError, setTransferMemberError] = useState(false);

  const [removingMembers, setRemovingMembers] = useState<Set<string>>(new Set());

  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState('');

  const canManageMembers =
    user.role === UserRole.ADMIN ||
    projectResponse.userRole === ProjectRole.OWNER ||
    projectResponse.userRole === ProjectRole.ADMIN;

  const canTransferOwnership =
    user.role === UserRole.ADMIN || projectResponse.userRole === ProjectRole.OWNER;

  const eligibleMembers = members.filter((member) => {
    if (member.role === ProjectRole.OWNER) return false;

    if (member.userId === user.id || member.email === user.email) {
      return user.role === UserRole.ADMIN && projectResponse.userRole !== ProjectRole.OWNER;
    }

    return true;
  });

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const response: GetMembersResponse = await projectMembershipApi.getMembers(
        projectResponse.id,
      );
      setMembers(response.members);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? StringUtils.capitalizeFirstLetter(error.message)
          : 'Failed to load members';
      toastMessage.error(errorMessage);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (user.role !== UserRole.ADMIN) return;

    setIsSearchingUsers(true);
    try {
      const response = await userManagementApi.getUsers({
        limit: 10,
        query: query || undefined,
      });
      const activeUsers = response.users.filter((u) => u.isActive);
      setUserSearchResults(activeUsers);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? StringUtils.capitalizeFirstLetter(error.message)
          : 'Failed to search users';
      toastMessage.error(errorMessage);
      setUserSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  useEffect(() => {
    if (user.role !== UserRole.ADMIN || !isAddMemberModalOpen) return;

    const timer = setTimeout(() => {
      searchUsers(searchInputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInputValue, isAddMemberModalOpen]);

  const handleAddMember = async () => {
    if (!addMemberForm.email.trim()) {
      setAddMemberEmailError(true);
      toastMessage.error('Email is required');
      return;
    }
    setAddMemberEmailError(false);
    setIsAddingMember(true);

    try {
      const request: AddMemberRequest = {
        email: addMemberForm.email.trim(),
        role: addMemberForm.role,
      };
      const response: AddMemberResponse = await projectMembershipApi.addMember(
        projectResponse.id,
        request,
      );

      const emailToRemember = request.email;
      setAddMemberForm({ email: '', role: ProjectRole.MEMBER });
      setIsAddMemberModalOpen(false);

      if (response.status === AddMemberStatusEnum.ADDED) {
        toastMessage.success('Member added successfully');
        loadMembers();
      } else if (response.status === AddMemberStatusEnum.INVITED) {
        setInvitedEmail(emailToRemember);
        setIsInviteDialogOpen(true);
        loadMembers();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? StringUtils.capitalizeFirstLetter(error.message)
          : 'Failed to add member';
      toastMessage.error(errorMessage);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: ProjectRole) => {
    setChangingRoleFor(userId);
    setIsChangingRole(true);

    try {
      const request: ChangeMemberRoleRequest = { role: newRole };
      await projectMembershipApi.changeMemberRole(projectResponse.id, userId, request);

      setMembers((prev) =>
        prev.map((member) => (member.userId === userId ? { ...member, role: newRole } : member)),
      );

      toastMessage.success('Member role updated successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? StringUtils.capitalizeFirstLetter(error.message)
          : 'Failed to change member role';
      toastMessage.error(errorMessage);
    } finally {
      setChangingRoleFor(null);
      setIsChangingRole(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberEmail: string) => {
    setRemovingMembers((prev) => new Set(prev).add(userId));

    try {
      await projectMembershipApi.removeMember(projectResponse.id, userId);
      setMembers((prev) => prev.filter((member) => member.userId !== userId));
      toastMessage.success(`Member "${memberEmail}" removed successfully`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? StringUtils.capitalizeFirstLetter(error.message)
          : 'Failed to remove member';
      toastMessage.error(errorMessage);
    } finally {
      setRemovingMembers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferForm.selectedMemberId) {
      setTransferMemberError(true);
      toastMessage.error('Please select a member to transfer ownership to');
      return;
    }

    const selectedMember = members.find(
      (member) => member.userId === transferForm.selectedMemberId,
    );
    if (!selectedMember) {
      toastMessage.error('Selected member not found');
      return;
    }

    setTransferMemberError(false);
    setIsTransferringOwnership(true);

    try {
      const request: TransferOwnershipRequest = {
        newOwnerEmail: selectedMember.email,
      };
      await projectMembershipApi.transferOwnership(projectResponse.id, request);

      setTransferForm({ selectedMemberId: '' });
      setIsTransferOwnershipModalOpen(false);
      toastMessage.success('Ownership transferred successfully');
      loadMembers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? StringUtils.capitalizeFirstLetter(error.message)
          : 'Failed to transfer ownership';
      toastMessage.error(errorMessage);
    } finally {
      setIsTransferringOwnership(false);
    }
  };

  const getRoleBadgeVariant = (role: ProjectRole): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (role) {
      case ProjectRole.OWNER:
        return 'destructive';
      case ProjectRole.ADMIN:
        return 'secondary';
      case ProjectRole.MEMBER:
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayText = (role: ProjectRole): string => {
    switch (role) {
      case ProjectRole.OWNER:
        return 'Owner';
      case ProjectRole.ADMIN:
        return 'Admin';
      case ProjectRole.MEMBER:
        return 'Member';
      default:
        return role;
    }
  };

  useEffect(() => {
    loadMembers();
  }, [projectResponse.id]);

  return (
    <div className="flex h-full pl-3">
      <div className="h-full w-full">
        <div className="h-full overflow-y-auto p-6">
          <div className="max-w-[850px]">
            <div className="mb-6 flex items-center justify-end">
              <div className="flex space-x-2">
                {canTransferOwnership && (
                  <Button
                    variant="outline"
                    onClick={() => setIsTransferOwnershipModalOpen(true)}
                    disabled={isLoadingMembers || eligibleMembers.length === 0}
                  >
                    <ArrowLeftRight className="mr-2 size-4" />
                    Transfer ownership
                  </Button>
                )}
                {canManageMembers && (
                  <Button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    disabled={isLoadingMembers}
                  >
                    <Plus className="mr-2 size-4" />
                    Add member
                  </Button>
                )}
              </div>
            </div>

            {isLoadingMembers ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <div>
                <div className="mb-4 text-sm text-muted-foreground">
                  {members.length === 0
                    ? 'No members found'
                    : `${members.length} member${members.length !== 1 ? 's' : ''}`}
                </div>

                {members.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <div className="mb-2">No members found</div>
                    {canManageMembers && (
                      <div className="text-sm">Click &quot;Add member&quot; to get started</div>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Member</TableHead>
                        <TableHead className="w-[150px]">Role</TableHead>
                        <TableHead className="w-[200px]">Joined</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((record) => {
                        const isCurrentUser = record.userId === user.id || record.email === user.email;

                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <User className="mr-2 size-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{record.name}</div>
                                  <div className="text-xs text-muted-foreground">{record.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {canManageMembers && record.role !== ProjectRole.OWNER && !isCurrentUser ? (
                                <Select
                                  value={record.role}
                                  onValueChange={(newRole) => handleChangeRole(record.userId, newRole as ProjectRole)}
                                  disabled={changingRoleFor === record.userId && isChangingRole}
                                >
                                  <SelectTrigger className="h-8 w-[100px]">
                                    {changingRoleFor === record.userId && isChangingRole ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      <SelectValue />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={ProjectRole.ADMIN}>Admin</SelectItem>
                                    <SelectItem value={ProjectRole.MEMBER}>Member</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={getRoleBadgeVariant(record.role)}>
                                  {getRoleDisplayText(record.role)}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                <div>{dayjs(record.createdAt).format(getUserShortTimeFormat().format)}</div>
                                <div className="text-xs text-muted-foreground">{dayjs(record.createdAt).fromNow()}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {canManageMembers && record.role !== ProjectRole.OWNER && !isCurrentUser ? (
                                <div className="flex items-center space-x-2">
                                  <AlertDialog>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={removingMembers.has(record.userId)}
                                          >
                                            {removingMembers.has(record.userId) ? (
                                              <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                              <Trash2 className="size-4 text-destructive" />
                                            )}
                                          </Button>
                                        </AlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>Remove member</TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remove member</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to remove &quot;{record.email}&quot; from this project?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction variant="destructive" onClick={() => handleRemoveMember(record.userId, record.email)}>
                                          Remove
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {!canManageMembers && (
              <div className="mt-6 rounded-md bg-yellow-50 p-3">
                <div className="text-sm text-yellow-800">
                  You don&apos;t have permission to manage project members. Only project owners,
                  project admins and system administrators can add, edit or remove members.
                </div>
              </div>
            )}

            <Dialog open={isAddMemberModalOpen} onOpenChange={(open) => {
              if (!open) {
                setIsAddMemberModalOpen(false);
                setAddMemberForm({ email: '', role: ProjectRole.MEMBER });
                setAddMemberEmailError(false);
                setSearchInputValue('');
                setUserSearchResults([]);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add member</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <div className="mb-4">
                    <div className="mb-2 font-medium text-foreground">Email address</div>
                    {user.role === UserRole.ADMIN ? (
                      <div className="relative">
                        <Input
                          value={addMemberForm.email}
                          onChange={(e) => {
                            setAddMemberEmailError(false);
                            setAddMemberForm({
                              ...addMemberForm,
                              email: e.target.value.toLowerCase().trim(),
                            });
                            setSearchInputValue(e.target.value);
                          }}
                          onFocus={() => {
                            searchUsers('');
                          }}
                          placeholder="Enter email address"
                          className={addMemberEmailError ? 'border-destructive' : undefined}
                        />
                        {userSearchResults.length > 0 && (
                          <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-card shadow-lg">
                            {isSearchingUsers ? (
                              <div className="flex justify-center py-2">
                                <Spinner size="sm" />
                              </div>
                            ) : (
                              userSearchResults.map((searchUser) => (
                                <button
                                  key={searchUser.id}
                                  type="button"
                                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent"
                                  onClick={() => {
                                    setAddMemberForm({
                                      ...addMemberForm,
                                      email: searchUser.email.toLowerCase().trim(),
                                    });
                                    setUserSearchResults([]);
                                  }}
                                >
                                  {searchUser.name} ({searchUser.email})
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Input
                        value={addMemberForm.email}
                        onChange={(e) => {
                          setAddMemberEmailError(false);
                          setAddMemberForm({
                            ...addMemberForm,
                            email: e.target.value.toLowerCase().trim(),
                          });
                        }}
                        placeholder="Enter email address"
                        className={addMemberEmailError ? 'border-destructive' : undefined}
                      />
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      If the user exists, they will be added directly. Otherwise, an invitation will
                      be sent.
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="mb-2 font-medium text-foreground">Role</div>
                    <Select
                      value={addMemberForm.role}
                      onValueChange={(role) => setAddMemberForm({ ...addMemberForm, role: role as ProjectRole })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ProjectRole.MEMBER}>Member</SelectItem>
                        <SelectItem value={ProjectRole.ADMIN}>Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAddMember}
                    disabled={isAddingMember}
                  >
                    {isAddingMember ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Adding...
                      </>
                    ) : (
                      'Add member'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
              if (!open) setIsInviteDialogOpen(false);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>User invited</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <div className="flex items-center">
                    <UserPlus className="mr-3 size-6 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">
                        Invitation sent to {invitedEmail}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        The user is not present in the system yet, but has been invited to the
                        project. After the user signs up via specified email, they will automatically
                        become a member of the project.
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsInviteDialogOpen(false)}>OK</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isTransferOwnershipModalOpen} onOpenChange={(open) => {
              if (!open) {
                setIsTransferOwnershipModalOpen(false);
                setTransferForm({ selectedMemberId: '' });
                setTransferMemberError(false);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer project ownership</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <div className="mb-4 rounded-md bg-yellow-50 p-3">
                    <div className="text-sm text-yellow-800">
                      <strong>Warning:</strong> This action cannot be undone. You will lose ownership
                      of this project and the new owner will have full control.
                    </div>
                  </div>

                  {eligibleMembers.length === 0 ? (
                    <div className="rounded-md bg-muted p-4 text-center">
                      <div className="text-sm text-muted-foreground">
                        No members available to transfer ownership to. You need to have at least one
                        other member in the project to transfer ownership.
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="mb-2 font-medium text-foreground">Select new owner</div>
                      <Select
                        value={transferForm.selectedMemberId || undefined}
                        onValueChange={(memberId) => {
                          setTransferMemberError(false);
                          setTransferForm({ selectedMemberId: memberId });
                        }}
                      >
                        <SelectTrigger className={`w-full ${transferMemberError ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder="Select a member to transfer ownership to" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleMembers.map((member) => (
                            <SelectItem key={member.userId} value={member.userId}>
                              <div className="flex items-center">
                                <User className="mr-2 size-3.5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{member.name}</div>
                                  <div className="text-xs text-muted-foreground">{member.email}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-1 text-xs text-muted-foreground">
                        The selected member will become the project owner
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsTransferOwnershipModalOpen(false);
                    setTransferForm({ selectedMemberId: '' });
                    setTransferMemberError(false);
                  }}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleTransferOwnership}
                    disabled={isTransferringOwnership || eligibleMembers.length === 0}
                  >
                    {isTransferringOwnership ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Transferring...
                      </>
                    ) : (
                      'Transfer ownership'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
