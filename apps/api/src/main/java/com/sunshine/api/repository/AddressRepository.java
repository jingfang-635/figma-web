package com.sunshine.api.repository;

import com.sunshine.api.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, Long> {
  Optional<Address> findByName(String name);
}