import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const CompanyContext = createContext();
const HISTORY_KEY = 'taiwan-company-network:recent-companies';

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider = ({ children }) => {
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyDetails, setCompanyDetails] = useState(null);
    const [recentCompanies, setRecentCompanies] = useState(() => {
        try {
            return JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
        } catch {
            return [];
        }
    });

    useEffect(() => {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(recentCompanies));
    }, [recentCompanies]);

    const rememberCompany = useCallback((name, details) => {
        if (!name) return;
        setRecentCompanies((current) => [
            { name, id: details?.id || null, visitedAt: Date.now() },
            ...current.filter((entry) => entry.name !== name),
        ].slice(0, 8));
    }, []);

    return (
        <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companyDetails, setCompanyDetails, recentCompanies, rememberCompany }}>
            {children}
        </CompanyContext.Provider>
    );
};
