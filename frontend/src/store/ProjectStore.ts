import { create } from 'zustand';
import { useAuthStore } from './AuthStore';

export interface Project {
  _id: string;
  name: string;
  description: string;
  problem: string;
  objectives: string;
  restrictions: string;
  companyName: string;
  companyContact: string;
  methodology: 'Scrum' | 'Kanban' | 'Waterfall' | 'Hibrida' | 'Personalizada' | 'Agile' | 'Espiral' | 'Prototipos' | 'RUP' | 'XP' | 'DevOps';
  createdAt: string;
}

export interface TeamMember {
  _id: string;
  user: {
    email: string;
    _id: string;
    name: string;
    rut: string;
    role: string;
  };
  project: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  operationalRole: string;
  workload: number;
  canComment?: boolean;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (projectData: Partial<Project>) => Promise<Project | null>;
  updateProject: (id: string, projectData: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  selectProject: (id: string) => Promise<void>;
  fetchMembers: (projectId: string) => Promise<void>;
  addMember: (projectId: string, memberData: { userId: string, role: string, operationalRole?: string, workload?: number }) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  loadTestProject: () => Promise<Project | null>;
}

const API_URL = 'http://localhost:5000/api';

export const useProjectStore = create<ProjectState>((set, get) => {
  return {
    projects: [],
    activeProject: null,
    members: [],
    isLoading: false,
    error: null,

    fetchProjects: async () => {
      set({ isLoading: true, error: null });
      try {
        const headers = useAuthStore.getState().getAuthHeaders();
        const response = await fetch(`${API_URL}/projects`, { headers });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Error fetching projects');

        set({ projects: data, isLoading: false });

        // Set active project if there is one and none is selected
        if (data.length > 0 && !get().activeProject) {
          const storedActiveId = localStorage.getItem('tf_active_project_id');
          const match = data.find((p: Project) => p._id === storedActiveId);
          if (match) {
            set({ activeProject: match });
            get().fetchMembers(match._id);
          } else {
            set({ activeProject: data[0] });
            localStorage.setItem('tf_active_project_id', data[0]._id);
            get().fetchMembers(data[0]._id);
          }
        }
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
      }
    },

    createProject: async (projectData) => {
      set({ isLoading: true, error: null });
      try {
        const headers = useAuthStore.getState().getAuthHeaders();
        const response = await fetch(`${API_URL}/projects`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Error creating project');

        set(state => ({
          projects: [...state.projects, data],
          activeProject: data,
          isLoading: false
        }));
        localStorage.setItem('tf_active_project_id', data._id);
        get().fetchMembers(data._id);
        return data;
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        return null;
      }
    },

    loadTestProject: async () => {
      set({ isLoading: true, error: null });
      try {
        const headers = useAuthStore.getState().getAuthHeaders();
        const response = await fetch(`${API_URL}/projects/load-test-project`, {
          method: 'POST',
          headers
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error loading test project');

        set(state => ({
          projects: [...state.projects, data.project],
          activeProject: data.project,
          isLoading: false
        }));
        localStorage.setItem('tf_active_project_id', data.project._id);
        get().fetchMembers(data.project._id);
        return data.project;
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        return null;
      }
    },

    updateProject: async (id, projectData) => {
      set({ isLoading: true, error: null });
      try {
        const headers = useAuthStore.getState().getAuthHeaders();
        const response = await fetch(`${API_URL}/projects/${id}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Error updating project');

        set(state => ({
          projects: state.projects.map(p => p._id === id ? data : p),
          activeProject: state.activeProject?._id === id ? data : state.activeProject,
          isLoading: false
        }));
        return true;
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        return false;
      }
    },

    deleteProject: async (id) => {
      set({ isLoading: true, error: null });
      try {
        const headers = useAuthStore.getState().getAuthHeaders();
        const response = await fetch(`${API_URL}/projects/${id}`, {
          method: 'DELETE',
          headers
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Error deleting project');

        const updatedProjects = get().projects.filter(p => p._id !== id);
        let nextActive = null;
        if (updatedProjects.length > 0) {
          nextActive = updatedProjects[0];
          localStorage.setItem('tf_active_project_id', nextActive._id);
        } else {
          localStorage.removeItem('tf_active_project_id');
        }

        set({
          projects: updatedProjects,
          activeProject: nextActive,
          isLoading: false
        });

        if (nextActive) {
          await get().fetchMembers(nextActive._id);
        } else {
          set({ members: [] });
        }

        return true;
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        return false;
      }
    },

    selectProject: async (id) => {
      const match = get().projects.find(p => p._id === id);
      if (match) {
        set({ activeProject: match });
        localStorage.setItem('tf_active_project_id', id);
        await get().fetchMembers(id);
      }
    },

    fetchMembers: async (projectId) => {
      try {
        const headers = useAuthStore.getState().getAuthHeaders();
        const response = await fetch(`${API_URL}/projects/${projectId}/members`, { headers });
        const data = await response.json();

        if (response.ok) {
          set({ members: data });
        }
      } catch (err) {
        console.error('Error fetching members:', err);
      }
    },

    addMember: async (projectId, memberData) => {
      try {
        const headers = useAuthStore.getState().getAuthHeaders();
        const response = await fetch(`${API_URL}/projects/${projectId}/members`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(memberData)
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Error adding team member');

        set(state => ({
          members: [...state.members, data]
        }));
        return true;
      } catch (err: any) {
        alert(err.message);
        return false;
      }
    },

    removeMember: async (memberId) => {
      try {
        const headers = useAuthStore.getState().getAuthHeaders();
        const response = await fetch(`${API_URL}/projects/members/${memberId}`, {
          method: 'DELETE',
          headers
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Error removing team member');

        set(state => ({
          members: state.members.filter(m => m._id !== memberId)
        }));
        return true;
      } catch (err: any) {
        alert(err.message);
        return false;
      }
    }
  };
});
