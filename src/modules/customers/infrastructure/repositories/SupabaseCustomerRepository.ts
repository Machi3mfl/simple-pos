import type { SupabaseClient } from "@supabase/supabase-js";

import { Customer } from "../../domain/entities/Customer";
import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";

interface CustomerRow {
  id: string;
  name: string;
  created_at: string;
}

function mapRowToDomain(row: CustomerRow): Customer {
  return Customer.create({
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at),
  });
}

export class SupabaseCustomerRepository implements CustomerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Customer | null> {
    const { data, error } = await this.client
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read customer by id from Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToDomain(data as CustomerRow);
  }

  async findByName(name: string): Promise<Customer | null> {
    const normalizedName = name.trim();
    const { data, error } = await this.client
      .from("customers")
      .select("*")
      .ilike("name", normalizedName)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read customer by name from Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToDomain(data as CustomerRow);
  }

  async save(customer: Customer): Promise<void> {
    const data = {
      id: customer.getId(),
      name: customer.getName(),
      created_at: customer.getCreatedAt().toISOString(),
    };

    const { error } = await this.client
      .from("customers")
      .upsert(data, { onConflict: "id" });

    if (error) {
      throw new Error(`Failed to save customer in Supabase: ${error.message}`);
    }
  }
}
