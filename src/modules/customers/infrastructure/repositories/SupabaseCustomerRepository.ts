import type { SupabaseClient } from "@supabase/supabase-js";

import { Customer } from "../../domain/entities/Customer";
import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import {
  normalizeCustomerName,
  scoreCustomerNameMatch,
} from "../../domain/services/normalizeCustomerName";

interface CustomerRow {
  id: string;
  name: string;
  created_at: string;
  normalized_name?: string;
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
    const normalizedName = normalizeCustomerName(name);
    if (normalizedName.length === 0) {
      return null;
    }

    const { data, error } = await this.client
      .from("customers")
      .select("*")
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read customer by name from Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToDomain(data as CustomerRow);
  }

  async searchByName(query: string, limit: number): Promise<readonly Customer[]> {
    const normalizedQuery = normalizeCustomerName(query);
    if (normalizedQuery.length === 0) {
      return [];
    }

    const probe = normalizedQuery.slice(0, Math.min(4, normalizedQuery.length));
    const { data, error } = await this.client
      .from("customers")
      .select("*")
      .like("normalized_name", `%${probe}%`)
      .limit(Math.max(limit * 3, limit));

    if (error) {
      throw new Error(`Failed to search customers in Supabase: ${error.message}`);
    }

    const items = ((data ?? []) as CustomerRow[])
      .map(mapRowToDomain)
      .sort((left, right) => {
        const scoreDifference =
          scoreCustomerNameMatch(left.getName(), normalizedQuery) -
          scoreCustomerNameMatch(right.getName(), normalizedQuery);
        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return left.getName().localeCompare(right.getName(), "es");
      });

    return items.slice(0, limit);
  }

  async listRecent(limit: number): Promise<readonly Customer[]> {
    const { data, error } = await this.client
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list recent customers in Supabase: ${error.message}`);
    }

    return ((data ?? []) as CustomerRow[]).map(mapRowToDomain);
  }

  async save(customer: Customer): Promise<void> {
    const data = {
      id: customer.getId(),
      name: customer.getName(),
      normalized_name: normalizeCustomerName(customer.getName()),
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
