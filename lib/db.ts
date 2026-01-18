import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface User {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
  groupId: string;
}

export interface Group {
  id: string;
  name: string;
  userId: string; // primary user
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  payerId: string;
  groupId: string;
  participantIds: string[];
  splitMode: 'equal' | 'custom' | 'percentage';
  splits: { participantId: string; amount: number }[];
  createdAt: string;
  updatedAt: string;
}

class Database {
  private usersFile = path.join(DATA_DIR, 'users.json');
  private groupsFile = path.join(DATA_DIR, 'groups.json');
  private participantsFile = path.join(DATA_DIR, 'participants.json');
  private expensesFile = path.join(DATA_DIR, 'expenses.json');

  private readFile<T>(file: string): T[] {
    try {
      if (!fs.existsSync(file)) {
        return [];
      }
      const data = fs.readFileSync(file, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private writeFile<T>(file: string, data: T[]): void {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  // Users
  getUsers(): User[] {
    return this.readFile<User>(this.usersFile);
  }

  getUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email === email);
  }

  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  createUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.writeFile(this.usersFile, users);
  }

  // Groups
  getGroups(): Group[] {
    return this.readFile<Group>(this.groupsFile);
  }

  getGroupsByUserId(userId: string): Group[] {
    return this.getGroups().filter(g => g.userId === userId);
  }

  getGroupById(id: string): Group | undefined {
    return this.getGroups().find(g => g.id === id);
  }

  createGroup(group: Group): void {
    const groups = this.getGroups();
    groups.push(group);
    this.writeFile(this.groupsFile, groups);
  }

  updateGroup(id: string, updates: Partial<Group>): void {
    const groups = this.getGroups();
    const index = groups.findIndex(g => g.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...updates, updatedAt: new Date().toISOString() };
      this.writeFile(this.groupsFile, groups);
    }
  }

  deleteGroup(id: string): void {
    const groups = this.getGroups().filter(g => g.id !== id);
    this.writeFile(this.groupsFile, groups);
    // Cascade delete participants and expenses
    const participants = this.getParticipants().filter(p => p.groupId !== id);
    this.writeFile(this.participantsFile, participants);
    const expenses = this.getExpenses().filter(e => e.groupId !== id);
    this.writeFile(this.expensesFile, expenses);
  }

  // Participants
  getParticipants(): Participant[] {
    return this.readFile<Participant>(this.participantsFile);
  }

  getParticipantsByGroupId(groupId: string): Participant[] {
    return this.getParticipants().filter(p => p.groupId === groupId);
  }

  getParticipantById(id: string): Participant | undefined {
    return this.getParticipants().find(p => p.id === id);
  }

  createParticipant(participant: Participant): void {
    const participants = this.getParticipants();
    participants.push(participant);
    this.writeFile(this.participantsFile, participants);
  }

  updateParticipant(id: string, updates: Partial<Participant>): void {
    const participants = this.getParticipants();
    const index = participants.findIndex(p => p.id === id);
    if (index !== -1) {
      participants[index] = { ...participants[index], ...updates };
      this.writeFile(this.participantsFile, participants);
    }
  }

  deleteParticipant(id: string): void {
    const participants = this.getParticipants().filter(p => p.id !== id);
    this.writeFile(this.participantsFile, participants);
    // Remove from groups
    const groups = this.getGroups();
    groups.forEach(group => {
      if (group.participantIds.includes(id)) {
        group.participantIds = group.participantIds.filter(pid => pid !== id);
      }
    });
    this.writeFile(this.groupsFile, groups);
    // Remove from expenses
    const expenses = this.getExpenses();
    expenses.forEach(expense => {
      if (expense.participantIds.includes(id) || expense.payerId === id) {
        expense.participantIds = expense.participantIds.filter(pid => pid !== id);
        expense.splits = expense.splits.filter(s => s.participantId !== id);
      }
    });
    this.writeFile(this.expensesFile, expenses);
  }

  // Expenses
  getExpenses(): Expense[] {
    return this.readFile<Expense>(this.expensesFile);
  }

  getExpensesByGroupId(groupId: string): Expense[] {
    return this.getExpenses().filter(e => e.groupId === groupId);
  }

  getExpenseById(id: string): Expense | undefined {
    return this.getExpenses().find(e => e.id === id);
  }

  createExpense(expense: Expense): void {
    const expenses = this.getExpenses();
    expenses.push(expense);
    this.writeFile(this.expensesFile, expenses);
  }

  updateExpense(id: string, updates: Partial<Expense>): void {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates, updatedAt: new Date().toISOString() };
      this.writeFile(this.expensesFile, expenses);
    }
  }

  deleteExpense(id: string): void {
    const expenses = this.getExpenses().filter(e => e.id !== id);
    this.writeFile(this.expensesFile, expenses);
  }
}

export const db = new Database();
