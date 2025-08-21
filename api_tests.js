#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Helper function to log with colors
const log = (message, color = colors.reset) => {
    console.log(`${color}${message}${colors.reset}`);
};

// Helper function to format test results
const logTest = (testName, passed, details = '') => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? colors.green : colors.red;
    log(`${status} ${testName}`, color);
    if (details) {
        log(`   ${details}`, colors.cyan);
    }
};

// Test function wrapper
const runTest = async (testName, testFn) => {
    try {
        const result = await testFn();
        logTest(testName, true, result);
        return true;
    } catch (error) {
        logTest(testName, false, `Error: ${error.message}`);
        return false;
    }
};

// Individual test functions
const testHealthEndpoint = async () => {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
    }
    return `Status: ${response.data.status}`;
};

const testGetRecipesBasic = async () => {
    const response = await axios.get(`${API_URL}/recipes?page=1&limit=5`);
    if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const { page, limit, total, data } = response.data;
    if (page !== 1 || limit !== 5) {
        throw new Error(`Expected page=1, limit=5, got page=${page}, limit=${limit}`);
    }
    
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Expected non-empty data array');
    }
    
    return `Retrieved ${data.length} recipes out of ${total} total`;
};

const testGetRecipesSorting = async () => {
    const response = await axios.get(`${API_URL}/recipes?page=1&limit=10`);
    const { data } = response.data;
    
    // Check if recipes are sorted by rating (descending)
    for (let i = 0; i < data.length - 1; i++) {
        const currentRating = data[i].rating || 0;
        const nextRating = data[i + 1].rating || 0;
        if (currentRating < nextRating) {
            throw new Error(`Recipes not sorted by rating: ${currentRating} < ${nextRating}`);
        }
    }
    
    return `Sorting verified: ratings from ${data[0]?.rating || 'N/A'} to ${data[data.length - 1]?.rating || 'N/A'}`;
};

const testSearchByTitle = async () => {
    const response = await axios.get(`${API_URL}/recipes/search?title=pie`);
    const { data } = response.data;
    
    if (!Array.isArray(data)) {
        throw new Error('Expected data array in response');
    }
    
    // Check if all results contain "pie" in title (case-insensitive)
    for (const recipe of data) {
        if (!recipe.title || !recipe.title.toLowerCase().includes('pie')) {
            throw new Error(`Recipe "${recipe.title}" doesn't contain "pie"`);
        }
    }
    
    return `Found ${data.length} recipes containing "pie"`;
};

const testSearchByRating = async () => {
    const response = await axios.get(`${API_URL}/recipes/search?rating=>=4.5`);
    const { data } = response.data;
    
    // Check if all results have rating >= 4.5
    for (const recipe of data) {
        if (recipe.rating && recipe.rating < 4.5) {
            throw new Error(`Recipe "${recipe.title}" has rating ${recipe.rating} < 4.5`);
        }
    }
    
    return `Found ${data.length} recipes with rating >= 4.5`;
};

const testSearchByCalories = async () => {
    const response = await axios.get(`${API_URL}/recipes/search?calories=<=400`);
    const { data } = response.data;
    
    // Check if all results have calories <= 400
    for (const recipe of data) {
        if (recipe.nutrients && recipe.nutrients.calories) {
            const calories = parseInt(recipe.nutrients.calories.replace(/\D/g, ''));
            if (calories > 400) {
                throw new Error(`Recipe "${recipe.title}" has ${calories} calories > 400`);
            }
        }
    }
    
    return `Found ${data.length} recipes with calories <= 400`;
};

const testSearchByTotalTime = async () => {
    const response = await axios.get(`${API_URL}/recipes/search?total_time=<=60`);
    const { data } = response.data;
    
    // Check if all results have total_time <= 60
    for (const recipe of data) {
        if (recipe.total_time && recipe.total_time > 60) {
            throw new Error(`Recipe "${recipe.title}" has total_time ${recipe.total_time} > 60`);
        }
    }
    
    return `Found ${data.length} recipes with total_time <= 60 minutes`;
};

const testComplexSearch = async () => {
    const response = await axios.get(`${API_URL}/recipes/search?title=chicken&rating=>=4.0&total_time=<=120`);
    const { data } = response.data;
    
    // Verify all conditions are met
    for (const recipe of data) {
        if (!recipe.title.toLowerCase().includes('chicken')) {
            throw new Error(`Recipe doesn't contain "chicken": ${recipe.title}`);
        }
        if (recipe.rating && recipe.rating < 4.0) {
            throw new Error(`Recipe has rating < 4.0: ${recipe.rating}`);
        }
        if (recipe.total_time && recipe.total_time > 120) {
            throw new Error(`Recipe has total_time > 120: ${recipe.total_time}`);
        }
    }
    
    return `Found ${data.length} recipes matching complex search criteria`;
};

const testPagination = async () => {
    const page1 = await axios.get(`${API_URL}/recipes?page=1&limit=3`);
    const page2 = await axios.get(`${API_URL}/recipes?page=2&limit=3`);
    
    const data1 = page1.data.data;
    const data2 = page2.data.data;
    
    // Check that pages return different recipes
    const ids1 = new Set(data1.map(r => r.id));
    const ids2 = new Set(data2.map(r => r.id));
    
    for (const id of ids1) {
        if (ids2.has(id)) {
            throw new Error(`Recipe ID ${id} appears in both pages`);
        }
    }
    
    return `Page 1: ${data1.length} recipes, Page 2: ${data2.length} recipes (no overlap)`;
};

const testDataIntegrity = async () => {
    const response = await axios.get(`${API_URL}/recipes?page=1&limit=10`);
    const { data } = response.data;
    
    let validRecipes = 0;
    let issues = [];
    
    for (const recipe of data) {
        let valid = true;
        
        // Check required fields
        if (!recipe.title) {
            issues.push(`Recipe ${recipe.id}: missing title`);
            valid = false;
        }
        
        // Check data types
        if (recipe.rating && (typeof recipe.rating !== 'number' || isNaN(recipe.rating))) {
            issues.push(`Recipe ${recipe.id}: invalid rating`);
            valid = false;
        }
        
        if (recipe.prep_time && (typeof recipe.prep_time !== 'number' || isNaN(recipe.prep_time))) {
            issues.push(`Recipe ${recipe.id}: invalid prep_time`);
            valid = false;
        }
        
        // Check nutrients structure
        if (recipe.nutrients && typeof recipe.nutrients !== 'object') {
            issues.push(`Recipe ${recipe.id}: invalid nutrients format`);
            valid = false;
        }
        
        if (valid) validRecipes++;
    }
    
    if (issues.length > 0) {
        throw new Error(`Data integrity issues: ${issues.slice(0, 3).join(', ')}${issues.length > 3 ? '...' : ''}`);
    }
    
    return `All ${validRecipes} recipes passed data integrity checks`;
};

// Main test runner
const runAllTests = async () => {
    log('\n🧪 Starting Recipe API Tests...\n', colors.bright);
    
    const tests = [
        ['Health Endpoint', testHealthEndpoint],
        ['Get Recipes (Basic)', testGetRecipesBasic],
        ['Get Recipes (Sorting)', testGetRecipesSorting],
        ['Search by Title', testSearchByTitle],
        ['Search by Rating', testSearchByRating],
        ['Search by Calories', testSearchByCalories],
        ['Search by Total Time', testSearchByTotalTime],
        ['Complex Search', testComplexSearch],
        ['Pagination', testPagination],
        ['Data Integrity', testDataIntegrity]
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const [testName, testFn] of tests) {
        const success = await runTest(testName, testFn);
        if (success) {
            passed++;
        } else {
            failed++;
        }
        
        // Add small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    log('\n📊 Test Summary:', colors.bright);
    log(`✅ Passed: ${passed}`, colors.green);
    log(`❌ Failed: ${failed}`, colors.red);
    log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`, colors.blue);
    
    if (failed === 0) {
        log('🎉 All tests passed! Your API is working correctly.', colors.green);
    } else {
        log('⚠️  Some tests failed. Please check your API implementation.', colors.yellow);
        process.exit(1);
    }
};

// Handle script execution
if (require.main === module) {
    runAllTests().catch(error => {
        log(`\n💥 Test execution failed: ${error.message}`, colors.red);
        log('\n🔧 Make sure your server is running on http://localhost:3001', colors.yellow);
        process.exit(1);
    });
}

module.exports = { runAllTests };