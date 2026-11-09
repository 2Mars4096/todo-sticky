fn main() {
    if let Err(error) = todo_sticky_lib::cli::run(std::env::args().skip(1)) {
        todo_sticky_lib::cli::print_error(&error);
        std::process::exit(1);
    }
}
