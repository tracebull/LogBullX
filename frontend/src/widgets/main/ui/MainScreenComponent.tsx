import { Suspense, lazy, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { APP_VERSION } from '../../../constants';
import { type DiskUsage, diskApi } from '../../../entity/disk';
import { type ProjectResponse, projectApi } from '../../../entity/projects';
import {
  type UserProfile,
  UserRole,
  type UsersSettings,
  settingsApi,
  userApi,
} from '../../../entity/users';
import { ThemeToggle } from '../../../features/users/ui/ThemeToggle';
import { useScreenHeight } from '../../../shared/hooks';
import { toastMessage } from '../../../shared/lib/toastMessage';
import { MobilePlaceholderComponent } from './MobilePlaceholderComponent';
import { ProjectSelectionComponent } from './ProjectSelectionComponent';

const CreateProjectDialogComponent = lazy(() =>
  import('../../../features/projects/ui/CreateProjectDialogComponent').then((m) => ({
    default: m.CreateProjectDialogComponent,
  })),
);
const ProjectApiKeysComponent = lazy(() =>
  import('../../../features/projects/ui/ProjectApiKeysComponent').then((m) => ({
    default: m.ProjectApiKeysComponent,
  })),
);
const ProjectMembershipComponent = lazy(() =>
  import('../../../features/projects/ui/ProjectMembershipComponent').then((m) => ({
    default: m.ProjectMembershipComponent,
  })),
);
const ProjectSettingsComponent = lazy(() =>
  import('../../../features/projects/ui/ProjectSettingsComponent').then((m) => ({
    default: m.ProjectSettingsComponent,
  })),
);
const QueryComponentComponent = lazy(() =>
  import('../../../features/query/ui/QueryComponent').then((m) => ({
    default: m.QueryComponentComponent,
  })),
);
const SettingsComponent = lazy(() =>
  import('../../../features/settings/ui/SettingsComponent').then((m) => ({
    default: m.SettingsComponent,
  })),
);
const ProfileComponent = lazy(() =>
  import('../../../features/users/ui/ProfileComponent').then((m) => ({
    default: m.ProfileComponent,
  })),
);
const UsersComponent = lazy(() =>
  import('../../../features/users/ui/UsersComponent').then((m) => ({
    default: m.UsersComponent,
  })),
);

export const MainScreenComponent = () => {
  const screenHeight = useScreenHeight();
  const contentHeight = screenHeight - 95;

  const [selectedTab, setSelectedTab] = useState<
    'profile' | 'logbull-settings' | 'users' | 'search' | 'settings' | 'api-keys' | 'members'
  >('search');
  const [diskUsage, setDiskUsage] = useState<DiskUsage | undefined>(undefined);
  const [user, setUser] = useState<UserProfile | undefined>(undefined);
  const [globalSettings, setGlobalSettings] = useState<UsersSettings | undefined>(undefined);

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);

  const loadData = async () => {
    setIsLoading(true);

    try {
      const [diskUsage, user, projects, settings] = await Promise.all([
        diskApi.getDiskUsage(),
        userApi.getCurrentUser(),
        projectApi.getProjects(),
        settingsApi.getSettings(),
      ]);

      setDiskUsage(diskUsage);
      setUser(user);
      setProjects(projects.projects);
      setGlobalSettings(settings);
    } catch (e) {
      toastMessage.error((e as Error).message);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Set selected project if none selected and projects available
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      const previouslySelectedProjectId = localStorage.getItem('selected_project_id');
      const previouslySelectedProject = projects.find(
        (project) => project.id === previouslySelectedProjectId,
      );
      const projectToSelect = previouslySelectedProject || projects[0];
      setSelectedProject(projectToSelect);
    }
  }, [projects, selectedProject]);

  // Save selected project to localStorage
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selected_project_id', selectedProject.id);
    }
  }, [selectedProject]);

  const handleCreateProject = () => {
    setShowCreateProjectDialog(true);
  };

  const handleProjectCreated = async (newProject: ProjectResponse) => {
    // Reload projects and select the created one
    try {
      const projectsResponse = await projectApi.getProjects();
      setProjects(projectsResponse.projects);
      setSelectedProject(newProject);
      setSelectedTab('search');
    } catch (e) {
      toastMessage.error((e as Error).message);
    }
  };

  const isUsedMoreThan95Percent =
    diskUsage && diskUsage.usedSpaceBytes / diskUsage.totalSpaceBytes > 0.95;

  return (
    <>
      <div className="[@media(min-width:450px)]:hidden">
        <MobilePlaceholderComponent />
      </div>

      <div
        style={{ height: screenHeight }}
        className="hidden bg-background p-3 [@media(min-width:450px)]:block"
      >
        {/* ===================== NAVBAR ===================== */}
        <div className="mb-3 flex h-[60px] items-center rounded bg-card p-3 shadow">
          <div className="flex items-center gap-3 hover:opacity-80">
            <a href="/">
              <img className="h-[35px] w-[35px]" src="/logo.svg" />
            </a>
          </div>

          <div className="ml-6">
            {!isLoading && (
              <ProjectSelectionComponent
                projects={projects}
                selectedProject={selectedProject}
                onCreateProject={handleCreateProject}
                onProjectSelect={setSelectedProject}
                user={user}
                globalSettings={globalSettings}
              />
            )}
          </div>

          <div className="mr-3 ml-auto flex items-center gap-5">
            <ThemeToggle />
            {isUsedMoreThan95Percent && diskUsage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`cursor-pointer text-center text-xs ${isUsedMoreThan95Percent ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {(diskUsage.usedSpaceBytes / 1024 ** 3).toFixed(1)} of{' '}
                    {(diskUsage.totalSpaceBytes / 1024 ** 3).toFixed(1)} GB
                    <br />
                    ROM used (
                    {((diskUsage.usedSpaceBytes / diskUsage.totalSpaceBytes) * 100).toFixed(1)}%)
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  To make backups locally and restore them, you need to have enough space on your
                  disk. For restore, you need to have same amount of space that the backup size.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {/* ===================== END NAVBAR ===================== */}

        {isLoading ? (
          <div className="flex items-center justify-center py-2" style={{ height: contentHeight }}>
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="relative flex">
            <div
              className="max-w-[60px] min-w-[60px] rounded bg-card py-2 shadow"
              style={{ height: contentHeight }}
            >
              {[
                {
                  text: 'Search',
                  name: 'search',
                  icon: '/icons/menu/search-gray.svg',
                  selectedIcon: '/icons/menu/search-white.svg',
                  onClick: () => setSelectedTab('search'),
                  isAdminOnly: false,
                  marginTop: '0px',
                  isVisible: true,
                },
                {
                  text: 'Settings',
                  name: 'settings',
                  icon: '/icons/menu/project-settings-gray.svg',
                  selectedIcon: '/icons/menu/project-settings-white.svg',
                  onClick: () => setSelectedTab('settings'),
                  isAdminOnly: false,
                  marginTop: '0px',
                  isVisible: !!selectedProject,
                },
                {
                  text: 'Members',
                  name: 'members',
                  icon: '/icons/menu/users-gray.svg',
                  selectedIcon: '/icons/menu/users-white.svg',
                  onClick: () => setSelectedTab('members'),
                  isAdminOnly: false,
                  marginTop: '0px',
                  isVisible: !!selectedProject,
                },
                {
                  text: 'API Keys',
                  name: 'api-keys',
                  icon: '/icons/menu/key-gray.svg',
                  selectedIcon: '/icons/menu/key-white.svg',
                  onClick: () => setSelectedTab('api-keys'),
                  isAdminOnly: false,
                  marginTop: '0px',
                  isVisible: !!selectedProject,
                },
                {
                  text: 'Profile',
                  name: 'profile',
                  icon: '/icons/menu/profile-gray.svg',
                  selectedIcon: '/icons/menu/profile-white.svg',
                  onClick: () => setSelectedTab('profile'),
                  isAdminOnly: false,
                  marginTop: '0px',
                  isVisible: true,
                },
                {
                  text: 'TraceBull settings',
                  name: 'logbull-settings',
                  icon: '/icons/menu/global-settings-gray.svg',
                  selectedIcon: '/icons/menu/global-settings-white.svg',
                  onClick: () => setSelectedTab('logbull-settings'),
                  isAdminOnly: true,
                  marginTop: '25px',
                  isVisible: true,
                },
                {
                  text: 'Users',
                  name: 'users',
                  icon: '/icons/menu/user-card-gray.svg',
                  selectedIcon: '/icons/menu/user-card-white.svg',
                  onClick: () => setSelectedTab('users'),
                  isAdminOnly: true,
                  marginTop: '0px',
                  isVisible: true,
                },
              ]
                .filter((tab) => !tab.isAdminOnly || user?.role === UserRole.ADMIN)
                .filter((tab) => tab.isVisible)
                .map((tab) => (
                  <div key={tab.text} className="flex justify-center">
                    <div
                      className={`flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded ${selectedTab === tab.name ? 'bg-primary' : 'hover:bg-accent'}`}
                      onClick={tab.onClick}
                      style={{ marginTop: tab.marginTop }}
                    >
                      <div className="mb-1">
                        <div className="flex justify-center">
                          <img
                            src={selectedTab === tab.name ? tab.selectedIcon : tab.icon}
                            width={20}
                            alt={tab.text}
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <Suspense
              fallback={
                <div
                  className="flex grow items-center justify-center rounded"
                  style={{ height: contentHeight }}
                >
                  <Spinner size="lg" />
                </div>
              }
            >
              {selectedTab === 'profile' && <ProfileComponent contentHeight={contentHeight} />}

              {selectedTab === 'logbull-settings' && (
                <SettingsComponent contentHeight={contentHeight} />
              )}

              {selectedTab === 'users' && (
                <UsersComponent contentHeight={contentHeight} globalSettings={globalSettings} user={user} />
              )}

              {projects.length === 0 &&
              (selectedTab === 'search' ||
                selectedTab === 'settings' ||
                selectedTab === 'api-keys' ||
                selectedTab === 'members') ? (
                <div
                  className="flex grow items-center justify-center rounded pl-5"
                  style={{ height: contentHeight }}
                >
                  {(user?.role === UserRole.ADMIN ||
                    globalSettings?.isMemberAllowedToCreateProjects !== false) && (
                    <Button
                      size="lg"
                      onClick={handleCreateProject}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Create project
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {selectedTab === 'settings' && selectedProject && user && (
                    <ProjectSettingsComponent
                      projectResponse={selectedProject}
                      contentHeight={contentHeight}
                      user={user}
                    />
                  )}
                  {selectedTab === 'api-keys' && selectedProject && user && (
                    <ProjectApiKeysComponent
                      projectResponse={selectedProject}
                      contentHeight={contentHeight}
                      user={user}
                    />
                  )}
                  {selectedTab === 'members' && selectedProject && user && (
                    <ProjectMembershipComponent
                      projectResponse={selectedProject}
                      contentHeight={contentHeight}
                      user={user}
                    />
                  )}
                  {selectedTab === 'search' && selectedProject && user && (
                    <QueryComponentComponent
                      projectId={selectedProject.id}
                      contentHeight={contentHeight}
                      user={user}
                    />
                  )}
                </>
              )}
            </Suspense>

            <div className="absolute bottom-1 left-2 mb-[0px] text-sm text-muted-foreground">
              v{APP_VERSION}
            </div>
          </div>
        )}

        {/* Create Project Dialog */}
        <Suspense fallback={null}>
          {showCreateProjectDialog && user && globalSettings && (
            <CreateProjectDialogComponent
              user={user}
              globalSettings={globalSettings}
              onClose={() => setShowCreateProjectDialog(false)}
              onProjectCreated={handleProjectCreated}
            />
          )}
        </Suspense>
      </div>
    </>
  );
};
