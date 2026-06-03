import { Suspense, lazy, useEffect, useState } from 'react';

import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { toastMessage } from '../../../shared/lib/toastMessage';
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

type TabId =
  | 'profile'
  | 'logbull-settings'
  | 'users'
  | 'search'
  | 'settings'
  | 'api-keys'
  | 'members';

const PAGE_TITLES: Record<TabId, string> = {
  search: 'Search',
  settings: 'Project Settings',
  members: 'Members',
  'api-keys': 'API Keys',
  profile: 'Profile',
  'logbull-settings': 'Settings',
  users: 'Users',
};

interface NavItemConfig {
  label: string;
  tab: TabId;
  icon: string;
  selectedIcon: string;
  adminOnly: boolean;
  visible: boolean;
  hasSeparator: boolean;
}

export const MainScreenComponent = () => {
  const [selectedTab, setSelectedTab] = useState<TabId>('search');
  const [diskUsage, setDiskUsage] = useState<DiskUsage | undefined>(undefined);
  const [user, setUser] = useState<UserProfile | undefined>(undefined);
  const [globalSettings, setGlobalSettings] = useState<UsersSettings | undefined>(undefined);

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 450);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(() => window.innerHeight - 140);

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

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selected_project_id', selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 450);
      setContentHeight(window.innerHeight - 140);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCreateProject = () => {
    setShowCreateProjectDialog(true);
  };

  const handleProjectCreated = async (newProject: ProjectResponse) => {
    try {
      const projectsResponse = await projectApi.getProjects();
      setProjects(projectsResponse.projects);
      setSelectedProject(newProject);
      setSelectedTab('search');
    } catch (e) {
      toastMessage.error((e as Error).message);
    }
  };

  const handleNavClick = (tab: TabId) => {
    setSelectedTab(tab);
    setSheetOpen(false);
  };

  const isUsedMoreThan95Percent =
    diskUsage && diskUsage.usedSpaceBytes / diskUsage.totalSpaceBytes > 0.95;

  const allNavItems: NavItemConfig[] = [
    {
      label: 'Search',
      tab: 'search',
      icon: '/icons/menu/search-gray.svg',
      selectedIcon: '/icons/menu/search-white.svg',
      adminOnly: false,
      visible: true,
      hasSeparator: false,
    },
    {
      label: 'Project Settings',
      tab: 'settings',
      icon: '/icons/menu/project-settings-gray.svg',
      selectedIcon: '/icons/menu/project-settings-white.svg',
      adminOnly: false,
      visible: !!selectedProject,
      hasSeparator: false,
    },
    {
      label: 'Members',
      tab: 'members',
      icon: '/icons/menu/users-gray.svg',
      selectedIcon: '/icons/menu/users-white.svg',
      adminOnly: false,
      visible: !!selectedProject,
      hasSeparator: false,
    },
    {
      label: 'API Keys',
      tab: 'api-keys',
      icon: '/icons/menu/key-gray.svg',
      selectedIcon: '/icons/menu/key-white.svg',
      adminOnly: false,
      visible: !!selectedProject,
      hasSeparator: false,
    },
    {
      label: 'Profile',
      tab: 'profile',
      icon: '/icons/menu/profile-gray.svg',
      selectedIcon: '/icons/menu/profile-white.svg',
      adminOnly: false,
      visible: true,
      hasSeparator: false,
    },
    {
      label: 'Settings',
      tab: 'logbull-settings',
      icon: '/icons/menu/global-settings-gray.svg',
      selectedIcon: '/icons/menu/global-settings-white.svg',
      adminOnly: true,
      visible: true,
      hasSeparator: true,
    },
    {
      label: 'Users',
      tab: 'users',
      icon: '/icons/menu/user-card-gray.svg',
      selectedIcon: '/icons/menu/user-card-white.svg',
      adminOnly: true,
      visible: true,
      hasSeparator: false,
    },
  ];

  const navItems = allNavItems
    .filter((item) => !item.adminOnly || user?.role === UserRole.ADMIN)
    .filter((item) => item.visible);

  const renderContent = () => {
    if (
      projects.length === 0 &&
      (selectedTab === 'search' ||
        selectedTab === 'settings' ||
        selectedTab === 'api-keys' ||
        selectedTab === 'members')
    ) {
      return (
        <div className="flex h-full items-center justify-center">
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
      );
    }

    return (
      <>
        {selectedTab === 'profile' && <ProfileComponent contentHeight={contentHeight} />}

        {selectedTab === 'logbull-settings' && (
          <SettingsComponent contentHeight={contentHeight} />
        )}

        {selectedTab === 'users' && (
          <UsersComponent
            contentHeight={contentHeight}
            globalSettings={globalSettings}
            user={user}
          />
        )}

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
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={`h-screen flex flex-col overflow-hidden bg-background ${isMobile ? '' : 'p-3'}`}
      >
        {/* ===================== HEADER ===================== */}
        <div
          className={`flex-shrink-0 flex items-center bg-card shadow ${
            isMobile ? 'px-3 py-2' : 'rounded p-3 mb-3'
          }`}
        >
          {isMobile && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2 flex-shrink-0">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 flex flex-col gap-1">
                  {navItems.map((item) => (
                    <button
                      key={item.tab}
                      onClick={() => handleNavClick(item.tab)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        selectedTab === item.tab
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      } ${item.hasSeparator ? 'mt-3' : ''}`}
                    >
                      <img
                        src={selectedTab === item.tab ? item.selectedIcon : item.icon}
                        width={18}
                        alt={item.label}
                        loading="lazy"
                        className={selectedTab === item.tab ? 'dark:invert' : ''}
                      />
                      {item.label}
                    </button>
                  ))}
                </nav>
                <div className="mt-auto pt-4 text-center text-xs text-muted-foreground">
                  v{APP_VERSION}
                </div>
              </SheetContent>
            </Sheet>
          )}

          <div className="flex items-center gap-3 hover:opacity-80">
            <a href="/">
              <img className="h-[35px] w-[35px]" src="/logo.svg" alt="Logo" />
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
                  <div className="cursor-pointer text-center text-xs text-destructive">
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
        {/* ===================== END HEADER ===================== */}

        {/* ===================== BODY ===================== */}
        <div className="flex flex-1 overflow-hidden">
          {!isMobile && (
            <div className="flex-shrink-0 flex w-[60px] flex-col rounded bg-card py-2 shadow">
              {navItems.map((item) => (
                <div key={item.tab} className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded ${
                          selectedTab === item.tab
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        } ${item.hasSeparator ? 'mt-4' : ''}`}
                        onClick={() => handleNavClick(item.tab)}
                      >
                        <img
                          src={selectedTab === item.tab ? item.selectedIcon : item.icon}
                          width={20}
                          alt={item.label}
                          loading="lazy"
                          className={selectedTab === item.tab ? 'dark:invert' : ''}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
              <div className="mt-auto px-2 pb-2 text-center text-xs text-muted-foreground">
                v{APP_VERSION}
              </div>
            </div>
          )}

          <div className={`flex-1 flex flex-col overflow-hidden ${isMobile ? '' : 'ml-3'}`}>
            <div className="flex-shrink-0 rounded-t border-b border-border bg-card px-6 py-3">
              <h1 className="text-base font-medium text-foreground">{PAGE_TITLES[selectedTab]}</h1>
            </div>

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="flex flex-1 items-center justify-center">
                    <Spinner size="lg" />
                  </div>
                }
              >
                {renderContent()}
              </Suspense>
            )}
          </div>
        </div>
        {/* ===================== END BODY ===================== */}

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
    </TooltipProvider>
  );
};
