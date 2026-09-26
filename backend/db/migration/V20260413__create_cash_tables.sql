-- Migration: create cash_register and cash_transaction tables
CREATE TABLE IF NOT EXISTS cash_register (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  opened_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP NULL,
  opened_by VARCHAR(255) NOT NULL,
  closed_by VARCHAR(255),
  initial_balance DECIMAL(19,2) NOT NULL,
  current_balance DECIMAL(19,2) NOT NULL,
  open BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cash_transaction (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  register_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL,
  amount DECIMAL(19,2) NOT NULL,
  category VARCHAR(100),
  notes TEXT,
  order_id BIGINT,
  CONSTRAINT fk_cash_register FOREIGN KEY (register_id) REFERENCES cash_register(id)
);
