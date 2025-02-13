const db = require('../config/db');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

exports.createHarvestSale = async (req, res) => {
    const { user_id, province, price, bowl_weight, oval_weight, corner_weight, broken_weight, appointment_date } = req.body;
    const proof_photo = req.file ? `/uploads/harvest/${req.file.filename}` : null;

    try {
        await db.query(
            `INSERT INTO harvest_sales (user_id, province, price, bowl_weight, oval_weight, corner_weight, broken_weight, appointment_date, proof_photo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, province, price, bowl_weight, oval_weight, corner_weight, broken_weight, appointment_date, proof_photo]
        );
        res.status(201).json({ message: 'Pengajuan penjualan berhasil dibuat.' });
    } catch (error) {
        console.error('Error creating harvest sale:', error);
        res.status(500).json({ error: 'Gagal dalam membuat pengajuan penjualan.' });
    }
};

exports.getSales = async (req, res) => {
    try {
        const [result] = await db.query(`
            SELECT 
                hs.id AS sale_id, 
                hs.user_id, 
                hs.price, 
                hs.province, 
                hs.bowl_weight, 
                hs.oval_weight, 
                hs.corner_weight, 
                hs.broken_weight, 
                hs.created_at, 
                hs.status AS sale_status,
                hs.proof_photo,
                hs.appointment_date,
                u.id AS user_id, 
                u.name AS user_name, 
                u.email AS user_email, 
                u.no_telp AS user_phone,
                u.location AS user_location
            FROM harvest_sales hs
            JOIN users u ON hs.user_id = u.id
            ORDER BY hs.created_at DESC
        `);

        res.json(result);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: 'Gagal dalam mengambil data penjualan.' });
    }
};


exports.getSalesById = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query(`SELECT * FROM harvest_sales WHERE id = ?`, [id]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Penjualan tidak ditemukan.' });
        }

        res.json(result[0]);
    } catch (error) {
        console.error('Error fetching sale by ID:', error);
        res.status(500).json({ error: 'Gagal mendapatkan data penjualan.' });
    }
};

exports.updateSaleStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    console.log(id, status)

    if (![0, 1, 2, 3, 4, 5, 6].includes(status)) {
        return res.status(400).json({ message: "Status tidak valid." });
    }

    try {
        await db.query("UPDATE harvest_sales SET status = ? WHERE id = ?", [status, id]);
        res.json({ message: "Status penjualan berhasil diperbarui" });
    } catch (error) {
        console.error("Error updating sale status:", error);
        res.status(500).json({ error: "Gagal dalam memperbarui status." });
    }
};


exports.getSalesByUserId = async (req, res) => {
    const { userId } = req.params;

    try {
        const [result] = await db.query(
            `SELECT * FROM harvest_sales WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        res.json(result);
    } catch (error) {
        console.error('Error fetching sales by user ID:', error);
        res.status(500).json({ error: 'Gagal mendapatkan data penjualan.' });
    }
};

exports.cancelSale = async (req, res) => {
    const { id } = req.params;

    try {
        const [sale] = await db.query(`SELECT id, status FROM harvest_sales WHERE id = ?`, [id]);

        if (sale.length === 0) {
            return res.status(404).json({ message: "Penjualan tidak ditemukan." });
        }

        const { status } = sale[0];
        if (status !== 0 && status !== 1 && status !== 6) {
            return res
                .status(400)
                .json({ message: "Pembatalan tidak bisa dilakukan." });
        }
        
        await db.query(`UPDATE harvest_sales SET status = 4 WHERE id = ?`, [id]);

        res.status(200).json({ message: "Pembatalan pengajuan berhasil." });
    } catch (error) {
        console.error("Error cancelling sale:", error);
        res.status(500).json({ message: "Peladen mengalami galat." });
    }
};

exports.rescheduleSale = async (req, res) => {
    const { id } = req.params;
    const { appointment_date } = req.body;

    if (!appointment_date) {
        return res.status(400).json({ message: "Data janji temu wajib diisi." });
    }

    try {
        const [result] = await db.query(
            "UPDATE harvest_sales SET appointment_date = ?, status = 0 WHERE id = ?",
            [appointment_date, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Data Penjualan tidak ditemukan." });
        }

        res.json({ message: "Penjadwalan ulang berhasil dilakukan." });
    } catch (error) {
        console.error("Error rescheduling sale:", error);
        res.status(500).json({ message: "Peladen mengalami galat." });
    }
};

