add_test(NAME end_to_end
         COMMAND bash ${CMAKE_CURRENT_SOURCE_DIR}/run_tests.sh
         WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})
set_tests_properties(end_to_end PROPERTIES ENVIRONMENT "MCPC=$<TARGET_FILE:mcpc>")
