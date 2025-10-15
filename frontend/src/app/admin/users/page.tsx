'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersAPI } from '@/lib/api';
import { User } from '@/types';
import { Plus, Edit, Trash2, Users as UsersIcon } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'safety_manager' as 'admin' | 'safety_manager',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({ email: '', full_name: '', password: '', role: 'safety_manager' });
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      password: '', // Don't show password
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await usersAPI.delete(id);
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // For edit, only send changed fields
        const updateData: any = {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
        };
        await usersAPI.update(editingUser.id, updateData);
      } else {
        // For create, password is required
        if (!formData.password || formData.password.length < 8) {
          alert('Password must be at least 8 characters');
          return;
        }
        await usersAPI.create(formData);
      }
      setIsDialogOpen(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      alert(error.response?.data?.detail || 'Failed to save user');
    }
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin'
      ? 'bg-primary/10 text-primary'
      : 'bg-blue-500/10 text-blue-500';
  };

  return (
    <DashboardLayout requiredRole="admin">
      <PageHeader
        title="User Management"
        description="Manage system users and their roles"
        action={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        }
      />

      <div className="p-6">
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first user
              </p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {user.role.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update user information and role'
                : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name*</Label>
                <Input
                  id="full_name"
                  placeholder="e.g., John Doe"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email*</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., user@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password{editingUser ? ' (leave blank to keep current)' : '*'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Min. 8 characters'}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!editingUser}
                  minLength={editingUser ? undefined : 8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role*</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'admin' | 'safety_manager',
                    })
                  }
                  required
                >
                  <option value="safety_manager">Safety Manager</option>
                  <option value="admin">Administrator</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Admin: Full system access | Safety Manager: Monitoring only
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? 'Update' : 'Create'} User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
