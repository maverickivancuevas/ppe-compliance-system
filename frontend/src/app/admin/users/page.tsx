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
import { Plus, Edit, Trash2, Users as UsersIcon, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    admin_password: '',
    role: 'safety_manager' as 'super_admin' | 'admin' | 'safety_manager',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    digit: false,
    special: false,
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

  const checkPasswordRequirements = (password: string) => {
    setPasswordRequirements({
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digit: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    });
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({ email: '', full_name: '', password: '', admin_password: '', role: 'safety_manager' });
    setPasswordRequirements({ length: false, uppercase: false, lowercase: false, digit: false, special: false });
    setShowPassword(false);
    setShowAdminPassword(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      password: '',
      admin_password: '',
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
        // Include password if it's being changed
        if (formData.password) {
          const allRequirementsMet = Object.values(passwordRequirements).every(req => req);
          if (!allRequirementsMet) {
            alert('Password does not meet all security requirements');
            return;
          }
          updateData.password = formData.password;
        }
        await usersAPI.update(editingUser.id, updateData);
      } else {
        // For create, use admin endpoint with password confirmation
        const allRequirementsMet = Object.values(passwordRequirements).every(req => req);
        if (!allRequirementsMet) {
          alert('Password does not meet all security requirements');
          return;
        }

        if (!formData.admin_password) {
          alert('Admin password confirmation is required');
          return;
        }

        await usersAPI.adminCreate({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          admin_password: formData.admin_password,
        });
      }
      setIsDialogOpen(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      alert(error.response?.data?.detail || 'Failed to save user');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'admin':
        return 'bg-blue-500/10 text-blue-500';
      case 'safety_manager':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={met ? 'text-green-500' : 'text-muted-foreground'}>{text}</span>
    </div>
  );

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
                    <TableCell>
                      {user.role === 'super_admin' ? '••••••••@••••••.com' : user.email}
                    </TableCell>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update user information and role'
                : 'Create a new user account with strong security'}
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
                <Label htmlFor="role">Role*</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'super_admin' | 'admin' | 'safety_manager',
                    })
                  }
                  required
                >
                  <option value="safety_manager">Safety Manager</option>
                  <option value="admin">Administrator</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Super Admin: Full system access | Admin: Create safety managers & cameras | Safety Manager: Monitoring only
                </p>
              </div>

              {/* Password field - required for new users, optional for editing */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password{!editingUser && '*'}
                  {editingUser && <span className="text-xs text-muted-foreground ml-2">(Leave blank to keep current password)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingUser ? "Enter new password to reset" : "Enter strong password"}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      checkPasswordRequirements(e.target.value);
                    }}
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {formData.password && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-1.5">
                    <p className="text-xs font-medium mb-2">Password Requirements:</p>
                    <PasswordRequirement met={passwordRequirements.length} text="At least 12 characters" />
                    <PasswordRequirement met={passwordRequirements.uppercase} text="One uppercase letter" />
                    <PasswordRequirement met={passwordRequirements.lowercase} text="One lowercase letter" />
                    <PasswordRequirement met={passwordRequirements.digit} text="One number" />
                    <PasswordRequirement met={passwordRequirements.special} text="One special character (!@#$%^&*...)" />
                  </div>
                )}
              </div>

              {!editingUser && (
                <div className="space-y-2">
                    <Label htmlFor="admin_password">Your Super Admin Password*</Label>
                    <div className="relative">
                      <Input
                        id="admin_password"
                        type={showAdminPassword ? 'text' : 'password'}
                        placeholder="Confirm your password to create user"
                        value={formData.admin_password}
                        onChange={(e) =>
                          setFormData({ ...formData, admin_password: e.target.value })
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your super admin password to confirm user creation
                    </p>
                </div>
              )}
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
