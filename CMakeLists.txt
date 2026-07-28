cmake_minimum_required(VERSION 3.16)
project(mcpc CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Debug)
endif()
add_compile_options(-Wall -Wextra -g)

include_directories(include)

file(GLOB MCPC_SOURCES CONFIGURE_DEPENDS src/*.cpp)
list(REMOVE_ITEM MCPC_SOURCES ${CMAKE_SOURCE_DIR}/src/main.cpp)

add_library(mcpc_core STATIC ${MCPC_SOURCES})

add_executable(mcpc src/main.cpp)
target_link_libraries(mcpc PRIVATE mcpc_core)

enable_testing()
add_subdirectory(tests)
