package com.sunshine.api.repository;

import com.sunshine.api.entity.NavItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NavItemRepository extends JpaRepository<NavItem, Long> {
}