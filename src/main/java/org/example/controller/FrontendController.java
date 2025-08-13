package org.example.controller;


import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class FrontendController {

    @RequestMapping(value = "/{path:[^\\.]*}")
    public String redirect() {
        // Forward any route that is not a static file to index.html
        return "forward:/html/index.html";
    }
}
