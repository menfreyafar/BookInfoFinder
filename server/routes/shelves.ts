import { Request, Response } from "express";
import { sqlite } from "../db";

export async function createShelf(req: Request, res: Response) {
  try {
    const { name, description, location, capacity } = req.body;
    
    const result = sqlite.prepare(`
      INSERT INTO shelves (name, description, location, capacity, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, description, location, capacity, Date.now(), Date.now());
    
    const shelf = sqlite.prepare('SELECT * FROM shelves WHERE id = ?').get(result.lastInsertRowid);
    res.json(shelf);
  } catch (error) {
    console.error("Error creating shelf:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getAllShelves(req: Request, res: Response) {
  try {
    const shelves = sqlite.prepare('SELECT * FROM shelves WHERE is_active = 1 ORDER BY name').all();
    res.json(shelves);
  } catch (error) {
    console.error("Error fetching shelves:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function updateShelf(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, location, capacity } = req.body;
    
    sqlite.prepare(`
      UPDATE shelves 
      SET name = ?, description = ?, location = ?, capacity = ?, updated_at = ?
      WHERE id = ?
    `).run(name, description, location, capacity, Date.now(), id);
    
    const shelf = sqlite.prepare('SELECT * FROM shelves WHERE id = ?').get(id);
    res.json(shelf);
  } catch (error) {
    console.error("Error updating shelf:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function deleteShelf(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if shelf has books
    const booksCount = sqlite.prepare('SELECT COUNT(*) as count FROM books WHERE shelf = (SELECT name FROM shelves WHERE id = ?)').get(id);
    
    if (booksCount.count > 0) {
      return res.status(400).json({ error: "Não é possível remover estante que contém livros" });
    }
    
    sqlite.prepare('UPDATE shelves SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting shelf:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}