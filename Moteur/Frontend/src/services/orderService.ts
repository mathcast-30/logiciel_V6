import api from './api';

export type OrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface OrderItemCreate {
    material_id: number;
    quantity: number;
    unit_price: number;
    reference?: string | null;
}

export interface OrderItem extends OrderItemCreate {
    id: number;
    order_id: number;
    material_name?: string | null;
}

export interface OrderCreate {
    supplier_id: number;
    notes?: string | null;
    expected_delivery_date?: string | null;
    items: OrderItemCreate[];
    quote_id?: number | null;
}

export interface OrderUpdate {
    status?: OrderStatus;
    notes?: string | null;
    expected_delivery_date?: string | null;
}

export interface Order {
    id: number;
    supplier_id: number;
    status: OrderStatus;
    total_cost: number;
    created_at: string;
    expected_delivery_date?: string | null;
    notes?: string | null;
    supplier_name?: string | null;
    items: OrderItem[];
    quote_id?: number | null;
}

export const OrderService = {
    getAll: async (status?: OrderStatus, skip = 0, limit = 100): Promise<Order[]> => {
        const params: Record<string, any> = { skip, limit };
        if (status) {
            params.status = status;
        }
        const response = await api.get<Order[]>('/orders/', { params });
        return response.data;
    },

    create: async (data: OrderCreate): Promise<Order> => {
        const response = await api.post<Order>('/orders/', data);
        return response.data;
    },

    updateStatus: async (id: number, status: OrderStatus): Promise<Order> => {
        const response = await api.put<Order>(`/orders/${id}/status`, null, {
            params: { status }
        });
        return response.data;
    },

    receive: async (id: number): Promise<Order> => {
        const response = await api.post<Order>(`/orders/${id}/receive`);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/orders/${id}`);
    }
};

export default OrderService;
