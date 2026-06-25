
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('bb_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('bb_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const isBooking = 
        (product.category && String(product.category).toLowerCase().includes('booking')) || 
        (product.name && String(product.name).includes('(Booking)')) ||
        product.type === 'booking';

      if (isBooking) {
        const priceNum = typeof product.price === 'string' 
          ? parseInt(product.price.replace(/[^0-9]/g, '')) 
          : product.price;
        return [{ ...product, price: priceNum, quantity: 1 }];
      }

      // Filter out any booking items from the cart when adding products
      const filteredPrev = prev.filter(item => {
        const isItemBooking = 
          (item.category && String(item.category).toLowerCase().includes('booking')) || 
          (item.name && String(item.name).includes('(Booking)')) ||
          item.type === 'booking';
        return !isItemBooking;
      });

      const existing = filteredPrev.find(item => item.id === product.id);
      if (existing) {
        return filteredPrev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      const priceNum = typeof product.price === 'string' 
        ? parseInt(product.price.replace(/[^0-9]/g, '')) 
        : product.price;
        
      return [...filteredPrev, { ...product, price: priceNum, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart(() => []);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      totalItems, 
      totalPrice 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
