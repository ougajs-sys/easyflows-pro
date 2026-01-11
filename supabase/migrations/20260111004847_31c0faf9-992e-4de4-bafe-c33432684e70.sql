
-- Créer le trigger pour déduire automatiquement le stock du livreur lors d'une livraison
CREATE TRIGGER trigger_deduct_delivery_stock_on_sale
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_delivery_stock_on_sale();

-- Ajouter un commentaire pour documenter
COMMENT ON TRIGGER trigger_deduct_delivery_stock_on_sale ON orders IS 'Déduit automatiquement le stock du livreur quand une commande passe en "delivered"';
